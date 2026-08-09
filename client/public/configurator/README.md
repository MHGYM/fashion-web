# FightMarketing — 3D Glove Configurator

Modulaire 3D-productconfigurator. **Vanilla JS + Three.js, geen build-stap.**

Live: `/configurator/` · lokaal: serveer `client/public/` en open `/configurator/`
(direct openen vanaf schijf werkt niet — browsers blokkeren dan modules en de GLB).

---

## Twee modellen, zelfde 8 zones

De klant kiest eerst een model, daarna de kleuren. Beide modellen delen
dezelfde zone-set; wat niet op een model bestaat wordt in de UI als
**niet beschikbaar** getoond in plaats van verborgen.

| Zone | Groep | Omvat | Personalisatie |
|---|---|---|---|
| **Front Panel** | Panelen | slagvlak | kleur · afbeelding over het hele paneel (verplaatsen/schalen/roteren) |
| **Palm** | Panelen | complete palmzijde | kleur |
| **Outer Thumb** | Duim | buitenzijde duim | kleur |
| **Inner Thumb** | Duim | binnenzijde duim | kleur |
| **Wrist** | Sluiting | manchet | kleur · logo · tekst |
| **Laces** | Sluiting | veters — **alleen Lace-Up** | kleur |
| **Piping** | Details | bies langs de naden | kleur |
| **Stitching** | Details | stikwerk | kleur |

| Model | Sluiting | Bron |
|---|---|---|
| **Velcro** | klittenband, geen veters | Sketchfab "Boxing gloves" (A1905), CC-BY-4.0 |
| **Lace-Up** | veters + gewatteerde manchet | aangeleverd door de klant |

Uploads: een afbeelding op het Front Panel dekt het paneel volledig. Logo en
tekst horen bij de Wrist.

---

## Architectuur

Bewust gesplitst in **productdefinitie** (verandert nooit), **modelregister**
(welke modellen zijn er) en **model-binding** (hoe elk model de zones levert):

```
js/
├── zones.js              PRODUCT — de 8 zones (gegroepeerd) + 16 kleuren.
│                         Model-onafhankelijk; blijft gelijk bij een nieuw model.
│
├── model-profile.js      REGISTER — alle beschikbare modellen; valideert dat
│                         elk profiel alle zones dekt (waarschuwt anders).
│
├── models/
│   ├── velcro.js         BINDING — Velcro-model (meshnamen, camerastandpunten,
│   │                     materiaalinstellingen, CC-BY-bronvermelding).
│   └── laceup.js         BINDING — Lace-Up-model.
│
├── scene3d.js            GENERIEKE renderer. Kent géén zone- of meshnamen;
│                         leest alles uit het actieve profiel. `loadModel()`
│                         wisselt tijdens de sessie van GLB (ruimt het vorige
│                         model volledig op: geometrie, materialen, texturen).
│
└── configurator.js       UI. Bouwt zichzelf op uit zones.js + model-profile.js
                          en praat met de 3D-laag uitsluitend via zone-id's.
```

**Een model toevoegen**: zet het `.glb` in `assets/`, maak een profiel in
`models/` (kopieer een bestaande als basis), en voeg het toe aan `MODELS` in
`model-profile.js`. `zones.js`, `configurator.js` en `scene3d.js` blijven
ongemoeid — dat is het hele punt van de opzet.

Een zone die in een profiel ontbreekt, valt niet stil weg: `model-profile.js`
markeert hem automatisch als niet-beschikbaar én logt een waarschuwing in de
console, zodat een vergeten binding meteen opvalt.

---

## Hoe kleur en artwork werken

Elke zone krijgt één canvas-textuur die de volledige UV-ruimte van die zone
beslaat. Daarop wordt getekend: eerst de effen zonekleur, daarna een eventuele
afbeelding. Omdat het canvas de hele UV dekt, bedekt een upload automatisch het
complete paneel.

Logo en tekst op de Wrist gaan **niet** via UV maar via een `DecalGeometry`.
Reden: de manchet-UV is opgeknipt in meerdere, deels gespiegelde eilanden,
waardoor UV-plaatsing de badge op de verkeerde kant of ondersteboven zet. Een
decal wordt in 3D geprojecteerd op het punt dat de klant vóór zich ziet — dat
werkt identiek op elk model, ook eentje met een heel andere UV-indeling.

Bij een modelwissel gaat de afbeelding/het logo bewust **niet** mee: de
UV-indeling verschilt per model, dus een 1-op-1 overzetting zou op een
onvoorspelbare plek belanden. Kleuren en de naam op de manchet (puur tekst,
geen UV-afhankelijke afbeelding) worden wél opnieuw toegepast.

---

## Model omzetten naar configurator-ready

`tools/build-velcro.py` en `tools/build-laceup.py` draaien headless in
Blender. Beide zetten een bronmodel om naar de 8 zone-namen die
`model-profile.js` verwacht (`front-panel`, `palm`, `outer-thumb`,
`inner-thumb`, `wrist`, `laces`, `piping`, `stitching`, plus een statische
`lining`) — maar met een verschillende aanpak, afhankelijk van wat het
bronmodel al biedt:

- **build-velcro.py** — het bronmodel is wél ge-unwrapt maar NIET per
  onderdeel gesplitst. Splitst op **UV-eiland**: de naden die de 3D-artist
  zelf heeft gelegd, niet verzonnen grenzen. Twee scheidingen zijn wél
  geometrisch (outer/inner-thumb, op oriëntatie) omdat het bronmodel daar geen
  eigen naad voor had.
- **build-laceup.py** — het bronmodel had alle onderdelen al los van elkaar.
  Hernoemt alleen naar de standaardnamen en ruimt een verdwaald duplicaat op.

```bash
blender --background --python tools/build-velcro.py -- \
  <bron.glb> <uit.glb> <render-map> [--debug]
```

`--debug` geeft elke zone een felle debugkleur en rendert controle-aanzichten
— gebruik dat altijd om te verifiëren dat elke zone dekt wat zijn naam
belooft, vóórdat je het resultaat in de configurator zet.

Daarna comprimeren (beide scripts exporteren ongecomprimeerd):

```bash
npx @gltf-transform/cli optimize <uit.glb> <definitief.glb> \
  --simplify false --join false --palette false --compress meshopt
```

> **Let op:** de glTF-exporteur laat UV-coördinaten weg als geen enkel
> materiaal een textuur gebruikt. Beide scripts koppelen daarom een 1×1
> placeholder-texture aan elk materiaal. Zonder die truc komt het model zonder
> `TEXCOORD_0` binnen en werkt de artwork-projectie niet.

---

## Bronvermelding

Het Velcro-model is **"Boxing gloves" van A1905** (Sketchfab), **CC-BY-4.0**.
Die licentie vereist **zichtbare naamsvermelding bij publicatie**. De gegevens
staan in `models/velcro.js` onder `attribution` en worden onderaan de pagina
automatisch getoond zodra dat model actief is. Het Lace-Up-model is door de
klant aangeleverd en heeft geen vermeldingsplicht.
