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
       (Thumb_Outer/Thumb_Inner/Inner_Strip) ernaast, MAAR staat qua
       camera-oriëntatie aan de kant van het 'back'-camerapreset, niet
       'front' — bevestigd doordat het kleuren van de toenmalige
       'front-panel'-zone zichtbaar werd op het model bij het 'back'-preset
       i.p.v. 'front' (en andersom voor Back_Palm). Daarom NU gekoppeld aan
       zone 'back-panel' (was eerst 'front-panel', voor de camera-correctie
       hieronder rechtgezet).
     - Back_Palm is de duim-loze paneelhelft, camera-oriëntatie klopt met
       'front' → zone 'front-panel' (was eerst 'back-panel').
       artworkGroupOverride hieronder is nodig omdat de gedeelde
       artworkGroup in zones.js aanneemt dat 'front-panel' de duim-zijde is
       — hier is dat na de omwisseling juist 'back-panel' (Front_Palm) —
       exact hetzelfde patroon als Lace-Up's eigen artworkGroupOverride.
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
       verscholen onder Front_Palm/Back_Palm — de "enige, grootste basismesh"
       die de zone-definitie van 'palm' voor dit 2e-generatie Velcro-model
       beschrijft. Op klantverzoek volledig verborgen (zoneOverrides hieronder)
       i.p.v. als kleurbare tab getoond — alleen de dunne naad-lijntjes zijn
       toch al nauwelijks een bruikbare kleurkeuze voor de klant.
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

  // Zie toelichting bovenaan: 'front-panel' bindt hier Back_Palm (klopt met
  // camera-preset 'front'), niet de duim-zijde — daarom wijst dit de
  // thumb-groepering om naar 'back-panel' i.p.v. 'front-panel'. Zelfde
  // patroon/reden als Lace-Up's eigen artworkGroupOverride.
  artworkGroupOverride: ['back-panel', 'outer-thumb', 'inner-thumb', 'thumb-strip', 'thumb'],

  bindings: {
    'front-panel': { type: 'mesh', node: 'Back_Palm' },
    'back-panel':  { type: 'mesh', node: 'Front_Palm' },
    'palm':        { type: 'mesh', node: 'Inside_Panel' },
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
  // 'palm' (Inside_Panel) op klantverzoek ook verborgen — alleen bij dit
  // model, Lace-Up heeft geen 'palm'-override en toont 'm gewoon.
  zoneOverrides: {
    'laces': { hidden: true },
    'palm': { hidden: true },
  },

  staticNodes: [],

  // Eigen (klant-aangeleverd) bestand, geen extern CC-gelicentieerd model —
  // attribution() in configurator.js verwacht anders a.authorUrl/a.license
  // e.d. en zou die als "undefined" tonen. `null` laat de regel leeg. Zelfde
  // patroon als models/shinguard.js.
  attribution: null,
};
