/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — Velcro (2e generatie)
   ═══════════════════════════════════════════════════════════════════════════
   Vervangt het eerdere placeholder-model. Bron: eigen Meshy AI-generatie van
   de klant ("part-segmentation"-export — het bestand heette per ongeluk
   "...Steel Juggernaut Helmet..."; de geometrie zelf is onmiskenbaar een
   bokshandschoen, bevestigd met losstaande, geïsoleerde renders per mesh
   vóórdat dit profiel gebouwd is). Omgezet met tools/build-velcro.py: dat
   bronbestand komt al vooraf gesegmenteerd in 8 delen uit Meshy, dus alleen
   hernoemen/samenvoegen naar de configurator-zone-namen + Decimate/meshopt-
   compressie voor web — geen vormwijziging.

   Zeven van de negen gedeelde zones zijn hier beschikbaar: front-panel,
   back-panel (nieuw t.o.v. het vorige model), thumb (nieuw, ongesplitst —
   dit model heeft geen apart outer/inner-duim), wrist, piping, stitching en
   palm. outer-thumb/inner-thumb/thumb-strip/laces zijn hier niet van
   toepassing (zie 'unsupported' hieronder) — dat verandert niets aan wat
   Lace-Up zelf kan, dat model bindt gewoon zijn eigen zones onafhankelijk.

   Kanttekening bij 'palm': dit is verreweg de grootste mesh in het
   bronbestand (een volledige, gesloten basisschil van de hele handschoen).
   Front-panel/back-panel/thumb/wrist liggen er als losse panelen bovenop.
   Er is geen apart palm-only mesh, dus deze zone kleurt de palm plus wat
   verder nergens door een ander paneel gedekt wordt (voornamelijk kleine
   randen/naden) — in de praktijk overwegend de palm zelf, zie het
   analyse-rapport voor de volledige onderbouwing.
   ═══════════════════════════════════════════════════════════════════════════ */

export default {
  id: 'velcro',
  label: 'Velcro',
  sublabel: 'Klittenbandsluiting',
  modelUrl: 'assets/fm-glove-velcro.glb',

  capabilities: { hasUVs: true, closure: 'velcro' },

  cameraPresets: {
    front: { theta: 0,               phi: 1.18 },
    back:  { theta: Math.PI,         phi: 1.18 },
    top:   { theta: 0,               phi: 0.42 },
  },

  // Zelfde matte afwerking als Lace-Up (zie models/laceup.js voor de
  // toelichting) — bewust ongewijzigd overgenomen zodat beide modellen
  // identiek ogen naast elkaar.
  materialDefaults: {
    roughness: 0.78, metalness: 0.0,
    clearcoat: 0, clearcoatRoughness: 1, envMapIntensity: 0.4,
  },

  bindings: {
    'front-panel': { type: 'mesh', node: 'front-panel' },
    'back-panel':  { type: 'mesh', node: 'back-panel' },
    'thumb':       { type: 'mesh', node: 'thumb' },
    'wrist':       { type: 'mesh', node: 'wrist' },
    'piping':      { type: 'mesh', node: 'piping' },
    'stitching':   { type: 'mesh', node: 'stitching' },
    'palm':        { type: 'mesh', node: 'palm' },
    'laces':       { type: 'unsupported', reason: 'Dit model heeft een klittenbandsluiting, geen veters.' },
    'outer-thumb': { type: 'unsupported', reason: 'Dit model heeft de duim niet in buiten-/binnenzijde gesplitst — zie de aparte "Thumb"-zone.' },
    'inner-thumb': { type: 'unsupported', reason: 'Dit model heeft de duim niet in buiten-/binnenzijde gesplitst — zie de aparte "Thumb"-zone.' },
    'thumb-strip': { type: 'unsupported', reason: 'Dit model heeft geen losse naad-geometrie tussen duim en palm.' },
  },

  staticNodes: [],

  // Geen attribution-object: dit is een eigen (Meshy AI-)generatie van de
  // klant, geen extern CC-gelicentieerd model — showAttribution() in
  // configurator.js verwacht anders a.authorUrl/a.license e.d. en zou die
  // als "undefined" tonen. `null` laat de attributieregel gewoon leeg,
  // exact zoals de bestaande ternary in showAttribution() al ondersteunt.
  attribution: null,
};
