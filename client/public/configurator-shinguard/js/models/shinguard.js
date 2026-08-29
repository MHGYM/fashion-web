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

   Straps zijn 4 losse nodes (boven/onder × buiten/binnen) die in de
   opdracht als ÉÉN kleurbare zone gevraagd zijn ("Straps kunnen van kleur
   veranderen", niet 4 losse tabs). Daarvoor is een nieuw, generiek
   bindingstype 'mesh-multi' toegevoegd aan scene3d.js (alleen in DEZE
   kopie, de handschoen-configurator is niet aangeraakt): één gedeelde
   canvas-textuur, effen gevuld, toegepast op meerdere meshes tegelijk. Dat
   is veilig voor een platte kleurvulling (in tegenstelling tot een
   afbeelding) omdat de UV-indeling er dan niet toe doet.

   Velcro (voorheen ook een 'mesh-multi'-zone, Velcro_1..4) is op verzoek
   verwijderd als kleurzone/tab. De 4 meshes blijven wél in de scene, nu als
   staticNodes met een vaste, neutrale kleur (zelfde behandeling als
   Foot_Back/Elastic_foot/Elastic_heel) — geen losse witte/onbewerkte
   plekken in het model.

   Foot_Front is op verzoek juist WEL een eigen kleurzone geworden
   ("Front Foot"): het voorste, zwarte voetgedeelte onderaan. Voorheen was
   dit een staticNode; nu een gewone 'mesh'-binding, exact zoals Main
   Front/Main Back/Piping/Stitching.

   Foot_Back/Elastic_foot/Elastic_heel (de achterste voet-overkapping en
   elastische banden) blijven staticNodes — niet gevraagd, en zouden de
   tab-lijst onnodig laten groeien.
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

  // Grondig geverifieerd (rechtstreeks in de geladen Three.js-materialen,
  // niet alleen "aanwezig" aangenomen) dat baseColor/normal/roughness/
  // metalness-maps stuk voor stuk correct aan elke zone gekoppeld zijn: map
  // (srgb), normalMap (linear/""), roughnessMap+metalnessMap (linear/"",
  // gedeelde ORM-textuur) — colorSpace, UV's (niet-ontaard, matcht de
  // mesh-vorm) en normalScale (±1, overgenomen van normalTexture.scale: -1
  // in de originele GLB) staan allemaal correct. Ook met MeshNormalMaterial
  // gecontroleerd dat de normal-map echte, reële data bevat (geen lege/
  // vlakke kaart) — én met een pixel-steekproef op exact de UV-regio van
  // Main_Front tegen de ONGECOMPRIMEERDE originele 4096px-bron (dus geen
  // artefact van de eigen decimatie/compressie-pipeline).
  //
  // Wat wél ontbrak: de GLB zet zelf specularIntensity op 0
  // (KHR_materials_specular), waardoor de normal-map geen enkel render-
  // kanaal had om zich in te tonen (geen specular, geen bruikbare
  // omgevingsreflectie) — en de bestaande sterkte (normalScale ±1, zoals de
  // GLB het zelf aangeeft) bleek op dit model te subtiel om als zichtbare
  // korrel te lezen, vooral onder een verzadigde kleur-tint. specularIntensity
  // 0.9 + roughness 0.55 zetten dat kanaal aan; normalScaleMultiplier
  // vergroot de sterkte van diezelfde, al aanwezige kaart (geen nieuwe
  // textuur) tot leesbaar niveau. Geverifieerd op zwart, wit én rood.
  materialDefaults: {
    roughness: 0.55, metalness: 0.0,
    clearcoat: 0, clearcoatRoughness: 1, envMapIntensity: 0.4,
    specularIntensity: 0.9, normalScaleMultiplier: 4,
  },

  bindings: {
    'main-front': { type: 'mesh', node: 'Main_Front' },
    'main-back':  { type: 'mesh', node: 'Main_Back' },
    'piping':     { type: 'mesh', node: 'Piping' },
    'straps':     { type: 'mesh-multi', nodes: ['Strap_upper', 'Strap_bottom', 'Strapinner_upper', 'Strapinner_bottom'] },
    'stitching':  { type: 'mesh', node: 'Stitches' },
    'front-foot': { type: 'mesh', node: 'Foot_Front' },
  },

  staticNodes: ['Foot_Back', 'Elastic_foot', 'Elastic_heel', 'Velcro_1', 'Velcro_2', 'Velcro_3', 'Velcro_4'],

  // Eigen (klant-aangeleverd) bestand, geen extern CC-gelicentieerd model —
  // attribution() in configurator.js verwacht anders a.authorUrl/a.license
  // e.d. en zou die als "undefined" tonen. `null` laat de regel leeg.
  attribution: null,
};
