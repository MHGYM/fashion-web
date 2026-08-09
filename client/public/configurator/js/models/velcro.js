/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — Velcro
   ═══════════════════════════════════════════════════════════════════════════
   Gemodelleerde velcro-wedstrijdhandschoen.
   Bron: Sketchfab "Boxing gloves" van A1905, CC-BY-4.0 → naamsvermelding
   verplicht bij publicatie (zie `attribution`).

   Omgezet met tools/build-velcro.py: gesplitst op UV-eiland, dus langs de
   naden die de 3D-artist zelf heeft gelegd. Twee scheidingen zijn
   geometrisch en niet door de artist gelegd — expliciet vermeld:
     • outer/inner-thumb  gesplitst op oriëntatie (voorzijde vs palmzijde)
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

  materialDefaults: {
    roughness: 0.45, metalness: 0.02,
    clearcoat: 0.22, clearcoatRoughness: 0.3, envMapIntensity: 1.0,
  },

  bindings: {
    'front-panel': { type: 'mesh', node: 'front-panel' },
    'palm':        { type: 'mesh', node: 'palm' },
    'outer-thumb': { type: 'mesh', node: 'outer-thumb' },
    'inner-thumb': { type: 'mesh', node: 'inner-thumb' },
    'wrist':       { type: 'mesh', node: 'wrist' },
    'piping':      { type: 'mesh', node: 'piping' },
    'stitching':   { type: 'mesh', node: 'stitching' },
    'laces':       { type: 'unsupported', reason: 'Dit model heeft een klittenbandsluiting, geen veters.' },
  },

  staticNodes: ['lining'],

  attribution: {
    title: 'Boxing gloves', author: 'A1905',
    authorUrl: 'https://sketchfab.com/al1905',
    source: 'https://sketchfab.com/3d-models/boxing-gloves-3c85b09870a04253ba40472f5db55500',
    license: 'CC-BY-4.0', licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
  },
};
