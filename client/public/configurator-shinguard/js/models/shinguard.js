/* ═══════════════════════════════════════════════════════════════════════════
   MODEL-PROFIEL — Scheenbeschermer
   ═══════════════════════════════════════════════════════════════════════════
   Bron: "Protector.glb", aangeleverd door de klant. Eén model, geen
   varianten (dus geen model-profile.js/MODELS-lijst zoals bij de
   handschoen — configurator.js gebruikt dit profiel rechtstreeks).

   Geanalyseerd met geïsoleerde Blender-renders per node (niet alleen op de
   namen vertrouwd — zie de Lace-Up-handschoen in deze codebase voor een
   voorbeeld waarbij namen juist WEL misleidend bleken). Hier klopten de
   namen gewoon met de geometrie:
     Main_Front = de bolle, beschermende scheen-zijde (voorkant)  ✓
     Main_Back  = de vlakke kuit-zijde met de straps (achterkant) ✓
   Er was dus geen omwisseling nodig, in tegenstelling tot de Lace-Up.

   Straps en Velcro zijn elk 4 losse nodes (boven/onder × buiten/binnen,
   resp. 4 klittenband-stukjes) die in de opdracht als ÉÉN kleurbare zone
   gevraagd zijn ("Straps kunnen van kleur veranderen", niet 4 losse
   tabs). Daarvoor is een nieuw, generiek bindingstype 'mesh-multi'
   toegevoegd aan scene3d.js (alleen in DEZE kopie, de handschoen-
   configurator is niet aangeraakt): één gedeelde canvas-textuur, effen
   gevuld, toegepast op meerdere meshes tegelijk. Dat is veilig voor een
   platte kleurvulling (in tegenstelling tot een afbeelding) omdat de
   UV-indeling er dan niet toe doet.

   Foot_Front/Foot_Back/Elastic_foot/Elastic_heel (de voet-overkapping en
   elastische banden) zijn geen eigen zone — niet gevraagd in de opdracht,
   en zouden de tab-lijst onnodig laten groeien. Ze staan als staticNodes
   op een neutrale, vaste kleur (zelfde patroon als 'lining' bij de
   handschoen).
   ═══════════════════════════════════════════════════════════════════════════ */

export default {
  id: 'shinguard',
  label: 'Scheenbeschermer',
  sublabel: 'Protector',
  modelUrl: 'assets/fm-shinguard.glb',

  capabilities: { hasUVs: true },

  cameraPresets: {
    front: { theta: 0,               phi: 1.3 },
    back:  { theta: Math.PI,         phi: 1.3 },
    top:   { theta: 0,               phi: 0.5 },
  },

  // Zelfde matte afwerking als de bokshandschoen-configurator (zie
  // models/laceup.js voor de toelichting) — geen scherpe glans-highlight
  // over een geüpload logo heen.
  materialDefaults: {
    roughness: 0.78, metalness: 0.0,
    clearcoat: 0, clearcoatRoughness: 1, envMapIntensity: 0.4,
  },

  bindings: {
    'main-front': { type: 'mesh', node: 'Main_Front' },
    'main-back':  { type: 'mesh', node: 'Main_Back' },
    'piping':     { type: 'mesh', node: 'Piping' },
    'straps':     { type: 'mesh-multi', nodes: ['Strap_upper', 'Strap_bottom', 'Strapinner_upper', 'Strapinner_bottom'] },
    'velcro':     { type: 'mesh-multi', nodes: ['Velcro_1', 'Velcro_2', 'Velcro_3', 'Velcro_4'] },
    'stitching':  { type: 'mesh', node: 'Stitches' },
  },

  staticNodes: ['Foot_Front', 'Foot_Back', 'Elastic_foot', 'Elastic_heel'],

  // Eigen (klant-aangeleverd) bestand, geen extern CC-gelicentieerd model —
  // attribution() in configurator.js verwacht anders a.authorUrl/a.license
  // e.d. en zou die als "undefined" tonen. `null` laat de regel leeg.
  attribution: null,
};
