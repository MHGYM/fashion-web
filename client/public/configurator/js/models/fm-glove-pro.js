/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — "fm-glove-pro"
   ═══════════════════════════════════════════════════════════════════════════
   Gemodelleerde Velcro-wedstrijdhandschoen, omgezet naar 3 kleurzones.

   Bron: Sketchfab "Boxing gloves" van A1905, CC-BY-4.0.
   → BIJ PUBLICATIE IS NAAMSVERMELDING VERPLICHT (zie `attribution` onderaan).

   Hoe de zones tot stand kwamen (tools/build-configurator-model.py)
   ────────────────────────────────────────────────────────────────
   Het bronmodel is netjes ge-unwrapt, dus de UV-naden van de 3D-artist vallen
   samen met de ECHTE paneelranden. Er is op UV-eiland gesplitst en daarna
   samengevoegd tot de drie zones:

     front-panel  slagvlak + bovenzijde + volledige duim + piping rond het
                  lichaam. Eén doorlopend UV-vlak, zodat een geüploade
                  afbeelding de héle voorkant inclusief duim bedekt.
     palm         palmzijde, inclusief wat eerder 'back palm' heette.
     wrist        manchet + strap + trim + manchet-piping + stiksels.

   Stiksels zijn samengevoegd i.p.v. apart gehouden: uit een geïsoleerde
   render bleek het op dit model niet meer dan een dun randje onderlangs de
   manchet — visueel niet te onderscheiden van de trim.

   Een ander GLB koppelen? Alleen `modelUrl` en `bindings` hoeven te wijzigen.
   ═══════════════════════════════════════════════════════════════════════════ */

export default {
  id: 'fm-glove-pro',
  label: 'FightMarketing Pro (Velcro)',
  modelUrl: 'assets/fm-glove-pro.glb',

  capabilities: {
    hasUVs: true,
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

  /**
   * Zone-id (uit zones.js) → mesh in de GLB.
   * `type: 'mesh'` betekent: eigen object met eigen UV-ruimte, dus zowel
   * kleur als een UV-brede textuur zijn mogelijk.
   */
  bindings: {
    'front-panel': { type: 'mesh', node: 'front-panel' },
    'palm':        { type: 'mesh', node: 'palm' },
    'wrist':       { type: 'mesh', node: 'wrist' },
  },

  /** Niet-kleurbare onderdelen die wel gerenderd worden. */
  staticNodes: ['lining'],

  /** Verplichte bronvermelding (CC-BY-4.0) — toon dit op de pagina. */
  attribution: {
    title: 'Boxing gloves',
    author: 'A1905',
    authorUrl: 'https://sketchfab.com/al1905',
    source: 'https://sketchfab.com/3d-models/boxing-gloves-3c85b09870a04253ba40472f5db55500',
    license: 'CC-BY-4.0',
    licenseUrl: 'http://creativecommons.org/licenses/by/4.0/',
  },
};
