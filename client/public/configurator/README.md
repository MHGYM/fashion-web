# FightMarketing — 3D Glove Configurator

Modulaire 3D-productconfigurator. **Vanilla JS + Three.js, geen build-stap.**

Live: `/configurator/` · lokaal: serveer `client/public/` en open `/configurator/`
(direct openen vanaf schijf werkt niet — browsers blokkeren dan modules en de GLB).

---

## Architectuur

De code is bewust gesplitst in **productdefinitie** (verandert nooit) en
**model-binding** (verandert per 3D-model):

```
js/
├── zones.js                    PRODUCT — de 14 onderdelen + 16 kleuren
│                               Model-onafhankelijk. Verandert niet bij nieuw model.
│
├── model-profile.js            SCHAKELAAR — één import bepaalt het actieve model
│
├── models/
│   ├── scan-prototype.js       BINDING — hoe dít model de 14 zones levert
│   └── pro-uv-glove.example.js Blauwdruk voor een professioneel UV-model
│
├── decal-painters.js           Hoe een onderdeel eruitziet als het geprojecteerd
│                               wordt (piping = band, stitching = stippellijn, …)
│
├── scene3d.js                  GENERIEKE renderer. Kent géén zone- of meshnamen;
│                               leest alles uit het profiel.
│
└── configurator.js             UI. Bouwt zichzelf op uit zones.js.
```

**Kernregel:** `scene3d.js` en `configurator.js` bevatten geen enkele meshnaam.
Wil je een ander model? Dan raak je alleen `models/` + `model-profile.js` aan.

---

## Een nieuw 3D-model inzetten

1. Zet het bestand neer als `assets/<naam>.glb`
   (comprimeren: `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt`)

2. Bekijk de node- en materiaalnamen:
   ```
   npx @gltf-transform/cli inspect assets/<naam>.glb
   ```

3. Kopieer `models/pro-uv-glove.example.js` naar `models/<naam>.js` en vul per
   zone in hoe het model die levert (zie binding-types hieronder).

4. Wijzig in `model-profile.js` één regel:
   ```js
   import profile from './models/<naam>.js';
   ```

Klaar. De configurator hoeft verder niet aangepast te worden. Ontbreekt er een
zone in het profiel, dan waarschuwt de console bij het opstarten en wordt die
zone als "niet beschikbaar" getoond in plaats van stil te falen.

### Binding-types

| Type | Wanneer | Kwaliteit |
|---|---|---|
| `mesh` | Zone is een los, benoemd object in de GLB | Best — scherpe paneelranden |
| `material` | Zone is een materiaalslot in een gedeeld mesh (typisch bij UV-modellen) | Best |
| `decal` | Zone bestaat niet als geometrie; wordt geprojecteerd | Benadering |
| `unsupported` | Dit model kan de zone niet tonen | Zone wordt uitgegrijsd |

---

## Huidige status van het prototype

Het actieve model (`scan-prototype`) is een **3D-scan**, geen gemodelleerd
product. Consequenties, eerlijk benoemd:

- **Geen UV-mapping.** Fijne onderdelen (piping, trim, stitching, logo, naam,
  duim, strap) bestaan niet als geometrie en worden geprojecteerd. Ze zijn
  kleurbaar, maar volgen niet de echte paneelnaden van een handschoen.
- **Geen scheidbare duim.** De duim is in de scan vergroeid met de vuist.
- **Velcro, geen veters.** `laces` staat daarom bewust op `unsupported` in
  plaats van veters te suggereren die er fysiek niet zijn.
- Zone-grenzen volgen wiskundige regels (positie + oppervlakterichting), niet
  de echte naden.

**Voor productiekwaliteit is een gemodelleerde, UV-gemapte handschoen nodig.**
De configurator is daar volledig op voorbereid: alle 14 zones kunnen dan van
`decal` naar `mesh`/`material` — zonder één regel wijziging buiten `models/`.

---

## Integratiehaak

De pagina exposeert `window.FMConfigurator` voor koppeling aan winkelwagen,
prijsberekening of het maken van productafbeeldingen:

```js
FMConfigurator.getConfiguration()
// → { modelProfile: 'scan-prototype', colors: { 'top-panel': 'Red', … }, name: 'MO' }

FMConfigurator.renderNow()          // rondt animaties af en rendert één frame
FMConfigurator.viewer.goToPreset('back')
```

De zone-id's in `colors` (`top-panel`, `back-palm`, `strap`, …) zijn stabiel en
bedoeld om zo in de bestelling te worden opgeslagen. **Hernoem ze niet zonder
migratie** — ze staan in `localStorage` en straks in bestelregels.
