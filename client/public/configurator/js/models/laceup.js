/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — Lace-Up
   ═══════════════════════════════════════════════════════════════════════════
   Wedstrijdhandschoen met vetersluiting en gewatteerde manchet.
   Bron: "Back Cuff Padding Design.glb", aangeleverd door de klant.

   Dit model had alle onderdelen AL gescheiden; de omzetting
   (tools/build-laceup.py) hoefde alleen te hernoemen en op te schonen.

   Let op — de meshnamen in het bronbestand zijn omgedraaid t.o.v. de
   intuïtie; geverifieerd met geïsoleerde renders per mesh (rechtstreeks op
   "Back Cuff Padding Design.glb", niet alleen op de geconverteerde file):
       Back_Palm  = het slagvlak (voorkant)
       Front_Palm = de vetersluiting-zijde (rug van de hand)
   Er zijn maar twee hoofdpanelen in dit bronbestand — geen apart derde stuk
   geometrie voor een "rug van de hand". Op klantverzoek:
     - zone 'palm'        kleurt Back_Palm  (GLB-node 'front-panel', slagvlak)
     - zone 'front-panel' kleurt Front_Palm (GLB-node 'palm', rug van de hand)
       en wordt in de UI getoond als "Back Panel" i.p.v. "Front Panel" (zie
       `zoneOverrides` hieronder + `zoneDisplay()` in configurator.js) — er
       bestaat dus GEEN aparte "Front Panel"-tab meer op dit model, want die
       zou naar dezelfde mesh als "Back Panel" moeten wijzen (dubbele
       koppeling, expliciet afgewezen). Alleen de zone→node-koppeling en het
       label zijn aangepast; de geometrie/node-namen in het GLB-bestand zelf
       zijn niet aangeraakt. Velcro (ander model-profiel) toont zone-id
       'front-panel' gewoon als "Front Panel" — dat blijft ongewijzigd.
   Ook zat er een 'Inner_Black.001' in die ver buiten de handschoen lag en
   niets zichtbaars renderde; die is bij de omzetting verwijderd omdat hij
   alleen de bounding box (en daarmee het camerakader) scheeftrok.

   thumb-strip (bron: Inner_Strip) — toegevoegd nadat een klant een reep
   tussen duim en palm aanwees die niet herkleurbaar was. Die naad bleek uit
   twee losse meshes te bestaan: Thum_Inner (al "inner-thumb") en Inner_Strip,
   die zonder eigen zone in de statische voering zat. Nu een eigen zone —
   geverifieerd met isolatierenders vanuit dezelfde hoek als de klantfoto.
   'Inner_Black' is een ander onderdeel (het stiksel in de vetergeul) en
   blijft terecht in 'lining'.
   ═══════════════════════════════════════════════════════════════════════════ */

export default {
  id: 'laceup',
  label: 'Lace-Up',
  sublabel: 'Vetersluiting',
  modelUrl: 'assets/fm-glove-laceup.glb',

  capabilities: { hasUVs: true, closure: 'lace-up' },

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

  // Toont zone-id 'front-panel' als "Back Panel" op dit model (zelfde zone-
  // id/opslag/cart/productiebestand als altijd — alleen wat de klant LEEST
  // verandert). Zie zoneDisplay() in configurator.js.
  zoneOverrides: {
    'front-panel': {
      label: 'Back Panel',
      hint: 'Het rugpaneel (de vetersluiting-zijde).',
    },
    // Zonder deze override zou de al-nooit-gebonden zone-id 'back-panel'
    // als aparte, altijd-uitgegrijsde "Back Panel · n.v.t."-tab getoond
    // worden náást de hierboven hernoemde (wél werkende) "Back Panel"-tab
    // — twee tabs met identieke naam. Alleen op Lace-Up verborgen; Velcro
    // (waar geen naam-botsing is) toont 'm gewoon zoals altijd.
    'back-panel': { hidden: true },
    // 'velcro-strap' bestaat niet op dit model (vetersluiting i.p.v.
    // klittenband) — volledig verborgen i.p.v. grijs "n.v.t.", zelfde
    // patroon als hierboven bij 'back-panel' en het spiegelbeeld van hoe
    // Velcro zelf 'laces' verbergt (zie models/velcro.js).
    'velcro-strap': { hidden: true },
  },

  // De gedeelde artworkGroup in zones.js (['front-panel', 'outer-thumb', ...])
  // gaat ervan uit dat zone-id 'front-panel' de knokkelzijde is — op dit
  // model is dat na de omwisseling hierboven niet meer zo (het is nu "Back
  // Panel"/de vetersluiting-zijde). Zonder deze override zou een geüpload
  // logo dus op de verkeerde kant (de rug van de hand) belanden i.p.v. op de
  // palm/knokkelzijde. Zelfde lijst als het origineel, alleen 'front-panel'
  // vervangen door 'palm' (nu de echte knokkelzijde). Zie scene3d.js.
  artworkGroupOverride: ['palm', 'outer-thumb', 'inner-thumb', 'thumb-strip', 'thumb'],

  bindings: {
    // Bewust omgewisseld t.o.v. de GLB-nodenamen — zie de toelichting
    // bovenaan dit bestand: "Palm" kleurt het slagvlak (Back_Palm), "Front
    // Panel" (getoond als "Back Panel", zie zoneOverrides) kleurt de
    // vetersluiting-zijde (Front_Palm) — niet de node die toevallig
    // 'front-panel' heet in het geconverteerde bestand.
    'front-panel': { type: 'mesh', node: 'palm' },
    'palm':        { type: 'mesh', node: 'front-panel' },
    'outer-thumb': { type: 'mesh', node: 'outer-thumb' },
    'inner-thumb': { type: 'mesh', node: 'inner-thumb' },
    'thumb-strip': { type: 'mesh', node: 'thumb-strip' },
    // Geen apart duim-mesh in dit bronbestand (alleen outer/inner) — deze
    // zone stuurt daarom beide bestaande duim-zones tegelijk aan, als extra
    // gemakkelijke ingang naast de losse Outer Thumb/Inner Thumb-tabs, die
    // zelf gewoon onafhankelijk instelbaar blijven. Zie scene3d.js
    // ("mesh-group"-afhandeling in loadModel/setZoneColor).
    'thumb':       { type: 'mesh-group', nodes: ['outer-thumb', 'inner-thumb'] },
    'wrist':       { type: 'mesh', node: 'wrist' },
    'laces':       { type: 'mesh', node: 'laces' },
    // 'velcro-strap' bewust ongebonden — zie zoneOverrides.hidden hierboven.
    'piping':      { type: 'mesh', node: 'piping' },
    'stitching':   { type: 'mesh', node: 'stitching' },
    // Zone-id 'back-panel' zelf blijft ongebonden (n.v.t., automatisch via
    // model-profile.js) — dat is een ANDERE, ongebruikte zone-id dan de
    // hierboven hernoemde 'front-panel'. Er is geen derde stuk geometrie
    // om die apart aan te binden zonder 'front-panel' (nu "Back Panel") of
    // 'palm' te dupliceren, wat dezelfde canvas-textuur zou delen als een
    // al bestaande zone en die dus stuk zou maken (laatste kleurkeuze wint).
    // Onderzocht met geïsoleerde renders per mesh (op zowel het geconverteerde
    // bestand als rechtstreeks op "Back Cuff Padding Design.glb").
  },

  staticNodes: ['lining'],
};
