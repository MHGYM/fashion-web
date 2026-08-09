/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — Lace-Up
   ═══════════════════════════════════════════════════════════════════════════
   Wedstrijdhandschoen met vetersluiting en gewatteerde manchet.
   Bron: "Back Cuff Padding Design.glb", aangeleverd door de klant.

   Dit model had alle onderdelen AL gescheiden; de omzetting
   (tools/build-laceup.py) hoefde alleen te hernoemen en op te schonen.

   Let op — de meshnamen in het bronbestand zijn omgedraaid t.o.v. de
   intuïtie; geverifieerd met geïsoleerde renders per mesh:
       Back_Palm  = het slagvlak (voorkant)  → front-panel
       Front_Palm = de palmzijde             → palm
   Ook zat er een 'Inner_Black.001' in die ver buiten de handschoen lag en
   niets zichtbaars renderde; die is bij de omzetting verwijderd omdat hij
   alleen de bounding box (en daarmee het camerakader) scheeftrok.
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

  materialDefaults: {
    roughness: 0.42, metalness: 0.02,
    clearcoat: 0.26, clearcoatRoughness: 0.28, envMapIntensity: 1.0,
  },

  bindings: {
    'front-panel': { type: 'mesh', node: 'front-panel' },
    'palm':        { type: 'mesh', node: 'palm' },
    'outer-thumb': { type: 'mesh', node: 'outer-thumb' },
    'inner-thumb': { type: 'mesh', node: 'inner-thumb' },
    'wrist':       { type: 'mesh', node: 'wrist' },
    'laces':       { type: 'mesh', node: 'laces' },
    'piping':      { type: 'mesh', node: 'piping' },
    'stitching':   { type: 'mesh', node: 'stitching' },
  },

  staticNodes: ['lining'],
};
