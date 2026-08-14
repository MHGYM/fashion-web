/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — Velcro
   ═══════════════════════════════════════════════════════════════════════════
   ⚠ PLAATSHOUDER-MODEL — wordt later vervangen door een nieuw Velcro-ontwerp.
   Dit 3D-model is bewust niet verder gepolijst; de klant heeft expliciet
   gevraagd om er nu geen tijd in te steken. Wél moet de Velcro-KEUZE zelf
   in de configurator blijven werken, zodat klanten kunnen wisselen tussen
   Velcro en Lace-Up.

   Vervangen zodra het nieuwe model er is — geen enkele wijziging nodig aan
   de UI, scene3d.js of model-profile.js:
     1. Zet het nieuwe .glb in assets/ (bv. assets/fm-glove-velcro.glb
        overschrijven, of een nieuwe bestandsnaam + modelUrl hieronder).
     2. Werk `bindings` hieronder bij naar de meshnamen van het nieuwe model
        (per zone-id uit zones.js: front-panel, palm, outer-thumb,
        inner-thumb, thumb-strip, wrist, laces, piping, stitching).
     3. `cameraPresets` / `materialDefaults` / `attribution` naar wens
        aanpassen aan het nieuwe model/de nieuwe bronlicentie.
   Dat is alles — dit bestand is het ENIGE aanspreekpunt voor een Velcro-
   modelwissel.

   Huidig (tijdelijk) model:
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
    'front-panel': { type: 'mesh', node: 'front-panel' },
    'palm':        { type: 'mesh', node: 'palm' },
    'outer-thumb': { type: 'mesh', node: 'outer-thumb' },
    'inner-thumb': { type: 'mesh', node: 'inner-thumb' },
    'wrist':       { type: 'mesh', node: 'wrist' },
    'piping':      { type: 'mesh', node: 'piping' },
    'stitching':   { type: 'mesh', node: 'stitching' },
    'laces':       { type: 'unsupported', reason: 'Dit model heeft een klittenbandsluiting, geen veters.' },
    // Dit bronmodel heeft geen los mesh voor de naad tussen duim en palm —
    // die zit hier vast aan de duim. Niet kunstmatig gesplitst: de klant
    // heeft expliciet gevraagd dit placeholder-model niet te bewerken.
    'thumb-strip': { type: 'unsupported', reason: 'Dit onderdeel is op dit model niet als losse geometrie beschikbaar.' },
  },

  staticNodes: ['lining'],

  attribution: {
    title: 'Boxing gloves', author: 'A1905',
    authorUrl: 'https://sketchfab.com/al1905',
    source: 'https://sketchfab.com/3d-models/boxing-gloves-3c85b09870a04253ba40472f5db55500',
    license: 'CC-BY-4.0', licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
  },
};
