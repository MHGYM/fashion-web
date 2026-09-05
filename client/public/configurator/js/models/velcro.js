/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — Velcro
   ═══════════════════════════════════════════════════════════════════════════
   Bron: eigen, klant-aangeleverd bestand ("Glove.glb"), 10 losse meshes, één
   gedeeld materiaal (defaultMat.001, met ingebakken baseColor/normal/
   metallic-roughness-textures). Die ingebakken textures worden — net als bij
   álle modellen in deze configurator — niet gebruikt: scene3d.js vervangt elk
   gebonden mesh-materiaal door een eigen, effen-gevulde canvas-textuur (zie
   loadModel()). Alleen de mesh/node-namen zijn dus relevant.

   Mesh-namen NIET blind op vertrouwd — visueel geverifieerd met geïsoleerde,
   los-gerenderde meshes (elk mesh apart zichtbaar, rest verborgen) vanuit
   zowel de voor- als achterkant, zelfde methode als eerder bij de Lace-Up
   gebruikt (waar de raw source-namen destijds WEL verwisseld bleken):
     - Front_Palm groepeert visueel met de volledige duim-cluster
       (Thumb_Outer/Thumb_Inner/Inner_Strip) ernaast → dit is dus de zijde
       "slagvlak inclusief duim" → zone 'front-panel' (NIET verwisseld,
       anders dan bij Lace-Up: hier komt de raw naam wél overeen met de
       zone-betekenis).
     - Inner_Strip zit — net als bij Lace-Up — als dunne naad tussen duim en
       palm → zone 'thumb-strip'.
     - Back_Cuff is los gerenderd een stevig manchet-paneel bij de pols
       (groot genoeg voor de bestaande wrist-badge/logo-functionaliteit) →
       zone 'wrist'. NIET 'back-panel' — geometrisch een band om de pols,
       geen rugpaneel.
     - Velcro_Strap is los gerenderd een duidelijk zichtbare, substantiële
       band om de pols → eigen nieuwe zone 'velcro-strap' (toegevoegd aan
       zones.js, op Lace-Up als 'unsupported' gezet — zelfde patroon als
       'laces' hier).
     - Inside_Panel is los gerenderd bijna de VOLLEDIGE mitt-vorm, grotendeels
       verscholen onder Front_Palm/Back_Palm. Dit is precies de "enige,
       grootste basismesh van de hele handschoen" die de zone-definitie van
       'palm' hierboven (zones.js) al voor dit 2e-generatie Velcro-model
       beschrijft — front/back/duim/manchet liggen er als losse panelen
       bovenop. Vandaar 'palm' → Inside_Panel (NIET Back_Palm): de kleur is
       hierdoor grotendeels alleen als dunne naad-lijntjes zichtbaar tussen
       de andere panelen — bewust zo, op verzoek geaccepteerd.
     - Back_Palm is de resterende, duim-loze paneelhelft die BOVENOP
       Inside_Panel ligt → dit is het "volledig aparte, herkleurbare
       rugpaneel" dat de zone-definitie van 'back-panel' (zones.js) al
       specifiek voor dit model beschrijft → zone 'back-panel'.
     - Thumb_Outer/Thumb_Inner: directe zones 'outer-thumb'/'inner-thumb'.
       Zone 'thumb' bestaat NIET als aparte mesh — het is, net als bij
       Lace-Up, een mesh-group-gemak-zone die beide tegelijk aanstuurt.
     - Stitching/Piping: directe naamsmatch, ook visueel bevestigd
       (stiksel resp. rand-bies).
   ═══════════════════════════════════════════════════════════════════════════ */

export default {
  id: 'velcro',
  label: 'Velcro',
  sublabel: 'Klittenbandsluiting',
  modelUrl: 'assets/fm-glove-velcro.glb',

  capabilities: { hasUVs: true, closure: 'velcro' },

  cameraPresets: {
    front: { theta: 0.55,           phi: 1.18 },
    back:  { theta: Math.PI + 0.55, phi: 1.18 },
    top:   { theta: 0.55,           phi: 0.42 },
  },

  // Matte afwerking: geen clearcoat (dat gaf een scherpe glans-highlight die
  // over geüploade logo's/artwork heen liep), hogere roughness voor zachte
  // in plaats van harde lichtreflecties, lagere envMapIntensity zodat de
  // studio-omgeving niet als zichtbare witte glans terugkaatst. roughness
  // blijft < 1 en envMapIntensity blijft > 0 zodat de vorm van de handschoen
  // nog steeds met zachte shading leesbaar blijft — geen plat/cartoonachtig
  // materiaal.
  materialDefaults: {
    roughness: 0.78, metalness: 0.0,
    clearcoat: 0, clearcoatRoughness: 1, envMapIntensity: 0.4,
  },

  bindings: {
    'front-panel': { type: 'mesh', node: 'Front_Palm' },
    'palm':        { type: 'mesh', node: 'Inside_Panel' },
    'back-panel':  { type: 'mesh', node: 'Back_Palm' },
    'outer-thumb': { type: 'mesh', node: 'Thumb_Outer' },
    'inner-thumb': { type: 'mesh', node: 'Thumb_Inner' },
    'thumb-strip': { type: 'mesh', node: 'Inner_Strip' },
    'thumb':       { type: 'mesh-group', nodes: ['outer-thumb', 'inner-thumb'] },
    'wrist':       { type: 'mesh', node: 'Back_Cuff' },
    'velcro-strap':{ type: 'mesh', node: 'Velcro_Strap' },
    'piping':      { type: 'mesh', node: 'Piping' },
    'stitching':   { type: 'mesh', node: 'Stitching' },
  },

  // 'laces' bestaat niet op dit model (klittenband i.p.v. veters) — volledig
  // verborgen i.p.v. grijs "n.v.t.", zelfde patroon als 'back-panel' bij
  // Lace-Up (zie models/laceup.js). Andere modellen (Lace-Up) houden hun
  // eigen 'laces'-optie gewoon — dit raakt alleen de Velcro-tab-lijst.
  zoneOverrides: {
    'laces': { hidden: true },
  },

  staticNodes: [],

  // Eigen (klant-aangeleverd) bestand, geen extern CC-gelicentieerd model —
  // attribution() in configurator.js verwacht anders a.authorUrl/a.license
  // e.d. en zou die als "undefined" tonen. `null` laat de regel leeg. Zelfde
  // patroon als models/shinguard.js.
  attribution: null,
};
