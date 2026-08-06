/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — "scan-prototype"
   ═══════════════════════════════════════════════════════════════════════════
   Dit is de ENIGE plek die weet hoe dít 3D-bestand de 14 productzones levert.
   De renderer (scene3d.js) en de UI (configurator.js) kennen alleen zone-id's
   uit zones.js en lezen hier hoe ze gerealiseerd moeten worden.

   ── Een nieuw model toevoegen ──────────────────────────────────────────────
   1. Zet het .glb in assets/.
   2. Kopieer dit bestand naar models/<jouw-model>.js en pas `bindings` aan.
   3. Wijzig één regel in model-profile.js (de import).
   Verder hoeft er NIETS aan de configurator te veranderen.

   ── Ondersteunde binding-types ─────────────────────────────────────────────
   { type: 'mesh',     node: 'naam' }
        Zone is een los, benoemd object in de GLB. Beste kwaliteit: scherpe
        randen, exacte paneelvorm. Kleur = materiaal van dat object.

   { type: 'material', node: 'naam', material: 'MatNaam' }
        Zone is een materiaalslot binnen een gedeeld mesh (typisch voor een
        professioneel gemodelleerd, UV-gemapt model). Kleur = dat materiaal.
        VOORBEREID — de renderer ondersteunt dit al, dit model gebruikt het niet.

   { type: 'decal',    anchor: {...} }
        Zone bestaat niet als geometrie; wordt geprojecteerd op een echt
        oppervlak. Nodig bij scans zonder UV's. Minder scherp dan 'mesh'.

   { type: 'unsupported', reason: '...' }
        Dit model kan deze zone niet tonen. De UI toont 'm dan als
        niet-beschikbaar i.p.v. te doen alsof het werkt.
   ═══════════════════════════════════════════════════════════════════════════ */

export default {
  id: 'scan-prototype',
  label: 'Scan-prototype (Velcro)',
  modelUrl: 'assets/boxing_glove_segmented.glb',

  /** Eigenschappen van dit model — de UI kan hierop reageren. */
  capabilities: {
    hasUVs: false,          // fotoscan zonder UV-mapping
    hasSeparateThumb: false, // duim is vergroeid met de vuist
    hasLaces: false,        // dit is een Velcro-handschoen, geen lace-up
    closure: 'velcro',
  },

  /**
   * Camerastandpunten. Ook modelafhankelijk: een ander model kan een andere
   * oriëntatie hebben, dan pas je alleen deze hoeken aan.
   * theta = rotatie rond de verticale as, phi = hoogtehoek (radialen).
   */
  cameraPresets: {
    front: { theta: 0.55,           phi: 1.18 },
    back:  { theta: Math.PI + 0.55, phi: 1.18 },
    top:   { theta: 0.55,           phi: 0.42 },
  },

  /** Basis-materiaalinstellingen voor alle mesh-zones (leerachtige look). */
  materialDefaults: {
    roughness: 0.5,
    metalness: 0.02,
    clearcoat: 0.18,
    clearcoatRoughness: 0.32,
    envMapIntensity: 1.0,
  },

  /**
   * Zone-id (uit zones.js) → hoe dit model die zone levert.
   *
   * Decal-anker: `mesh` is het draagvlak, u/v/w zijn fracties (0..1) binnen de
   * bounding box van dát mesh, `size` is de projectiedoos in modeleenheden.
   * De renderer snapt het anker naar een écht vertex (de vorm is sterk gekromd,
   * dus een bounding-box-punt kan náást het oppervlak liggen).
   */
  bindings: {
    // ── Echte, losse meshes in de GLB ──────────────────────────────────────
    'top-panel':   { type: 'mesh', node: 'top-panel' },
    'front-panel': { type: 'mesh', node: 'front-panel' },
    'palm':        { type: 'mesh', node: 'palm' },
    'back-palm':   { type: 'mesh', node: 'palm-back' }, // GLB-naam wijkt af van zone-id
    'wrist':       { type: 'mesh', node: 'wrist' },

    // ── Bestaat niet als losse geometrie in deze scan → projectie ──────────
    // Duim: de scan heeft geen scheidbare duim-uitstulping. De duim-regio valt
    // geometrisch onder top-panel (buitenkant) en palm-back (binnenkant) —
    // geverifieerd door vertices te tellen onder x < -40.
    'outer-thumb': { type: 'decal', anchor: { mesh: 'top-panel',   u: 0.06, v: 0.45, w: 0.50, size: [95, 105, 80] } },
    'inner-thumb': { type: 'decal', anchor: { mesh: 'palm-back',   u: 0.06, v: 0.50, w: 0.50, size: [95, 105, 80] } },

    'strap':       { type: 'decal', anchor: { mesh: 'wrist',       u: 0.55, v: 0.50, w: 0.50, size: [200, 70, 95] } },
    'piping':      { type: 'decal', anchor: { mesh: 'top-panel',   u: 0.45, v: 0.10, w: 0.50, size: [190, 30, 90] } },
    'trim':        { type: 'decal', anchor: { mesh: 'wrist',       u: 0.55, v: 0.90, w: 0.50, size: [190, 34, 90] } },
    'stitching':   { type: 'decal', anchor: { mesh: 'wrist',       u: 0.55, v: 0.10, w: 0.50, size: [190, 26, 90] } },
    'logo':        { type: 'decal', anchor: { mesh: 'front-panel', u: 0.45, v: 0.60, w: 0.50, size: [95, 95, 80] } },
    'name':        { type: 'decal', anchor: { mesh: 'front-panel', u: 0.45, v: 0.35, w: 0.50, size: [150, 46, 80] } },

    // Velcro-handschoen: veters bestaan fysiek niet op dit model. Bewust
    // 'unsupported' i.p.v. een decal die veters suggereert waar er geen zijn.
    'laces':       { type: 'unsupported', reason: 'Dit prototype is een Velcro-handschoen zonder veters.' },
  },
};
