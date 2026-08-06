/* ═══════════════════════════════════════════════════════════════════════════
   VOORBEELDPROFIEL — professioneel UV-gemapt model (nog niet in gebruik)
   ═══════════════════════════════════════════════════════════════════════════
   Dit bestand draait niet mee; het is de blauwdruk voor straks. Zodra je een
   fatsoenlijk gemodelleerde handschoen hebt:

     1. Zet het bestand neer als assets/<naam>.glb
     2. Kopieer dit bestand naar models/<naam>.js
     3. Vul de node-/materiaalnamen in zoals ze in de GLB heten
        (zichtbaar met:  npx @gltf-transform/cli inspect assets/<naam>.glb)
     4. Zet in model-profile.js de import om naar dit bestand

   Merk op dat ALLE 14 zones hier `mesh` of `material` zijn — geen enkele
   decal meer. Dat is precies de winst van een UV-gemapt model: scherpe
   paneelranden en exacte naden i.p.v. geprojecteerde benaderingen. De
   configurator zelf hoeft daarvoor niet aangepast te worden.
   ═══════════════════════════════════════════════════════════════════════════ */

export default {
  id: 'pro-uv-glove',
  label: 'Pro Lace-Up (UV-gemapt)',
  modelUrl: 'assets/pro-uv-glove.glb',

  capabilities: {
    hasUVs: true,
    hasSeparateThumb: true,
    hasLaces: true,
    closure: 'lace-up',
  },

  cameraPresets: {
    front: { theta: 0.55,           phi: 1.18 },
    back:  { theta: Math.PI + 0.55, phi: 1.18 },
    top:   { theta: 0.55,           phi: 0.42 },
  },

  materialDefaults: {
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.0,
  },

  bindings: {
    // Losse objecten in de GLB
    'top-panel':   { type: 'mesh', node: 'TopPanel' },
    'front-panel': { type: 'mesh', node: 'FrontPanel' },
    'palm':        { type: 'mesh', node: 'Palm' },
    'back-palm':   { type: 'mesh', node: 'BackPalm' },
    'outer-thumb': { type: 'mesh', node: 'OuterThumb' },
    'inner-thumb': { type: 'mesh', node: 'InnerThumb' },
    'wrist':       { type: 'mesh', node: 'Wrist' },
    'strap':       { type: 'mesh', node: 'Strap' },
    'laces':       { type: 'mesh', node: 'Laces' },

    // Materiaalsloten binnen een gedeeld mesh — typisch voor fijne details
    // die als aparte materialen zijn gemodelleerd i.p.v. losse objecten.
    'piping':      { type: 'material', node: 'GloveBody', material: 'Piping' },
    'trim':        { type: 'material', node: 'GloveBody', material: 'Trim' },
    'stitching':   { type: 'material', node: 'GloveBody', material: 'Stitching' },

    // Logo en naam blijven bewust dynamisch: de klant vult ze zelf in, dus
    // die kunnen niet vooraf in de GLB zitten. Met UV's kan dit later ook
    // via een textuurregio i.p.v. een projectie.
    'logo':        { type: 'decal', anchor: { mesh: 'FrontPanel', u: 0.5, v: 0.6, w: 0.5, size: [95, 95, 80] } },
    'name':        { type: 'decal', anchor: { mesh: 'FrontPanel', u: 0.5, v: 0.35, w: 0.5, size: [150, 46, 80] } },
  },
};
