# FightMarketing — 3D Glove Configurator

Modulaire 3D-productconfigurator. **Vanilla JS + Three.js, geen build-stap.**

Live: `/configurator/` · lokaal: serveer `client/public/` en open `/configurator/`
(direct openen vanaf schijf werkt niet — browsers blokkeren dan modules en de GLB).

---

## De drie zones

| Zone | Omvat | Personalisatie |
|---|---|---|
| **Front Panel** | voorkant + bovenzijde + **volledige duim** + piping rondom | kleur · afbeelding over het hele paneel (verplaatsen/schalen/roteren) |
| **Palm** | complete palmzijde | kleur |
| **Wrist** | manchet + strap + trim + stiksels | kleur · logo · tekst |

Uploads: een afbeelding op het Front Panel dekt het paneel **inclusief de duim**.
Logo en tekst horen bij de Wrist.

---

## Architectuur

Bewust gesplitst in **productdefinitie** (verandert nooit) en **model-binding**
(verandert per 3D-model):

```
js/
├── zones.js              PRODUCT — de 3 zones + 16 kleuren.
│                         Model-onafhankelijk; blijft gelijk bij een nieuw model.
│
├── model-profile.js      SCHAKELAAR — één import bepaalt het actieve model.
│
├── models/
│   └── fm-glove-pro.js   BINDING — hoe dít GLB de zones levert (meshnamen,
│                         camerastandpunten, materiaalinstellingen).
│
├── scene3d.js            GENERIEKE renderer. Kent géén zone- of meshnamen;
│                         leest alles uit het profiel.
│
└── configurator.js       UI. Bouwt zichzelf op uit zones.js en praat met de
                          3D-laag uitsluitend via zone-id's.
```

**Een ander GLB koppelen** vergt alleen een nieuw bestand in `models/` en één
gewijzigde import in `model-profile.js`. `zones.js`, `configurator.js` en
`scene3d.js` blijven ongemoeid.

---

## Hoe kleur en artwork werken

Elke zone krijgt één canvas-textuur die de volledige UV-ruimte van die zone
beslaat. Daarop wordt getekend: eerst de effen zonekleur, daarna een eventuele
afbeelding. Omdat het canvas de hele UV dekt, bedekt een upload automatisch het
complete paneel — bij Front Panel dus inclusief de duim.

Logo en tekst op de Wrist gaan **niet** via UV maar via een `DecalGeometry`.
Reden: de manchet-UV is opgeknipt in meerdere, deels gespiegelde eilanden,
waardoor UV-plaatsing de badge op de verkeerde kant of ondersteboven zet. Een
decal wordt in 3D geprojecteerd op het punt dat de klant vóór zich ziet.

---

## Model omzetten naar configurator-ready

`tools/build-configurator-model.py` draait headless in Blender en splitst een
bronmodel op **UV-eiland** — dat wil zeggen: langs de naden die de 3D-artist
zelf heeft gelegd, niet langs verzonnen grenzen.

```bash
blender --background --python tools/build-configurator-model.py -- \
  <bron.glb> <uit.glb> <render-map>
```

Daarna comprimeren (het script exporteert ongecomprimeerd):

```bash
npx @gltf-transform/cli optimize <uit.glb> <definitief.glb> \
  --simplify false --join false --palette false --compress meshopt
```

Voeg `--debug` toe aan het Blender-commando voor felgekleurde zones en
controlerenders — gebruik dat altijd om te verifiëren dat elke zone dekt wat
zijn naam belooft.

> **Let op:** de glTF-exporteur laat UV-coördinaten weg als geen enkel materiaal
> een textuur gebruikt. Het script koppelt daarom een 1×1 placeholder-texture aan
> elk materiaal. Zonder die truc komt het model zonder `TEXCOORD_0` binnen en
> werkt de artwork-projectie niet.

---

## Bronvermelding

Het huidige model is **"Boxing gloves" van A1905** (Sketchfab), **CC-BY-4.0**.
Die licentie vereist **zichtbare naamsvermelding bij publicatie**. De gegevens
staan in `models/fm-glove-pro.js` onder `attribution`; die moeten nog op de
pagina getoond worden.
