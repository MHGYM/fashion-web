/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — "fm-glove-pro"
   ═══════════════════════════════════════════════════════════════════════════
   Gemodelleerde Velcro-wedstrijdhandschoen, omgezet naar configurator-ready.

   Bron: Sketchfab "Boxing gloves" van A1905, CC-BY-4.0.
   → BIJ PUBLICATIE IS NAAMSVERMELDING VERPLICHT (zie onderaan dit bestand).

   Hoe de zones tot stand zijn gekomen
   ───────────────────────────────────
   Dit model is netjes ge-unwrapt, dus de UV-naden van de 3D-artist vallen
   samen met de ECHTE paneelranden. De omzetting splitst daarom op UV-eiland;
   de grenzen zijn dus niet verzonnen maar overgenomen uit het ontwerp.

   Twee uitzonderingen, expliciet:
     • back-palm  — de palm is één UV-eiland; de scheiding palm/back-palm is
                    geometrisch (op hoogte), niet door de artist gelegd.
     • outer/inner-thumb — de duim is één stuk; gesplitst op oriëntatie
                    (voorzijde vs palmzijde).

   11 van de 14 zones zijn nu ECHTE meshes (voorheen 5). Alleen Logo en Naam
   blijven decals — die zijn per definitie dynamisch, want de klant vult ze in.
   ═══════════════════════════════════════════════════════════════════════════ */

export default {
  id: 'fm-glove-pro',
  label: 'FightMarketing Pro (Velcro)',
  modelUrl: 'assets/fm-glove-pro.glb',

  capabilities: {
    hasUVs: true,
    hasSeparateThumb: true,
    hasLaces: false,        // Velcro-sluiting, geen veters
    closure: 'velcro',
  },

  cameraPresets: {
    front: { theta: 0.55,           phi: 1.18 },
    back:  { theta: Math.PI + 0.55, phi: 1.18 },
    top:   { theta: 0.55,           phi: 0.42 },
  },

  materialDefaults: {
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.22,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.0,
  },

  bindings: {
    // ── Echte, losse meshes (gesplitst op de UV-naden van de artist) ───────
    'top-panel':   { type: 'mesh', node: 'top-panel' },
    'front-panel': { type: 'mesh', node: 'front-panel' },
    'palm':        { type: 'mesh', node: 'palm' },
    'back-palm':   { type: 'mesh', node: 'back-palm' },
    'outer-thumb': { type: 'mesh', node: 'outer-thumb' },
    'inner-thumb': { type: 'mesh', node: 'inner-thumb' },
    'wrist':       { type: 'mesh', node: 'wrist' },
    'strap':       { type: 'mesh', node: 'strap' },
    'piping':      { type: 'mesh', node: 'piping' },
    'trim':        { type: 'mesh', node: 'trim' },
    'stitching':   { type: 'mesh', node: 'stitching' },

    // ── Dynamisch: door de klant ingevuld, kan niet in de GLB zitten ───────
    'logo': { type: 'decal', anchor: { mesh: 'front-panel', u: 0.50, v: 0.55, w: 0.50, size: [0.9, 0.9, 1.2] } },
    'name': { type: 'decal', anchor: { mesh: 'front-panel', u: 0.50, v: 0.30, w: 0.50, size: [1.4, 0.4, 1.2] } },

    // ── Niet aanwezig op dit model ────────────────────────────────────────
    'laces': { type: 'unsupported', reason: 'Dit model is een Velcro-handschoen zonder veters.' },
  },

  /** Verplichte bronvermelding (CC-BY-4.0) — toon dit ergens op de pagina. */
  attribution: {
    title: 'Boxing gloves',
    author: 'A1905',
    authorUrl: 'https://sketchfab.com/al1905',
    source: 'https://sketchfab.com/3d-models/boxing-gloves-3c85b09870a04253ba40472f5db55500',
    license: 'CC-BY-4.0',
    licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
  },
};
