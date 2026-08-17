/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — 3D T-shirt Viewer (Three.js)
   ═══════════════════════════════════════════════════════════════════════════
   Zelfde architectuur als client/public/configurator/js/scene3d.js (bokshand-
   schoen): canvas-textuur voor kleur, DecalGeometry voor een geüpload
   logo/ontwerp en voor de naam, dezelfde matte materiaal-receptuur, dezelfde
   camera-fit/preset/zoom-opzet, dezelfde requestAnimationFrame-loop met
   achtergrondtab-vangnet (force-render als rAF niet op tijd tikt).

   Grootste verschil met de handschoen: tshirt.glb heeft geen los benoemde
   meshes per onderdeel (front-panel/palm/...) — het bestaat uit een paar
   generieke Object_N-meshes die puur om een technische exportlimiet zijn
   opgeknipt, niet per lichaamsdeel. Voor- en achterkant + mouwen worden hier
   daarom zelf geclassificeerd (positie-gebaseerd, dezelfde as-conventie en
   drempels als eerder gevalideerd met een Blender-render van dit exacte
   model: X = links/rechts, Y = hoogte, Z = voor/achter met hoge Z = voor).

   ÉÉN gedeeld materiaal voor front + back + beide mouwen samen — dat is
   precies wat garandeert dat een gekozen kleur overal naadloos doorloopt en
   een mouw nooit kan achterblijven op de oude kleur: er is maar één canvas/
   materiaal-object, alle 4 de zone-meshes wijzen ernaar.

   Logo en naam kunnen elk onafhankelijk op de voor- of achterkant geplaatst
   worden en zijn met de muis/touch versleepbaar (zie "SLEPEN" hieronder).
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from '../../configurator/js/vendor/three/three.module.js';
import { GLTFLoader } from '../../configurator/js/vendor/three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from '../../configurator/js/vendor/three/addons/controls/OrbitControls.js';
import { DecalGeometry } from '../../configurator/js/vendor/three/addons/geometries/DecalGeometry.js';
import { RoomEnvironment } from '../../configurator/js/vendor/three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from '../../configurator/js/vendor/three/addons/libs/meshopt_decoder.module.js';

const MODEL_URL = '/models/jersey-base.glb';
const TEX_SIZE = 1024;

// Zelfde classificatie-drempels als client/src/configurator3d/jersey/
// meshSplit.ts, opnieuw geverifieerd via Blender-render op dit exacte model.
const SLEEVE_X_FRACTION = 0.62;
const HEM_Y_FRACTION = 0.15;
const TARGET_HEIGHT = 1.09; // zelfde schaal-normalisatie als eerder gebruikt

// Hoever (in dezelfde -0.5..0.5-fractie als de transform.x/y) een klik van het
// midden van een laag mag afwijken om die laag nog "te pakken" te krijgen bij
// het slepen. Dezelfde 0.5-grens als hieronder voor clampPosition wordt ook
// gebruikt als uiterste rand — een laag kan dus nooit verder dan de rand van
// de al bestaande front/back-artworkzone (dezelfde zone die de Horizontaal/
// Verticaal-sliders al gebruikten) versleept worden.
const HIT_RADIUS = 0.28;

const MATERIAL_DEFAULTS = {
  roughness: 0.78, metalness: 0.0,
  clearcoat: 0, clearcoatRoughness: 1, envMapIntensity: 0.4,
};

function shadeColor(hex, amt) {
  const c = (hex || '#FFFFFF').replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const num = parseInt(full, 16) || 0xffffff;
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? -v : 255 - v) * Math.abs(amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function clampUnit(v) { return Math.max(-0.5, Math.min(0.5, v)); }

/** Verzamelt alle meshes van het model en classificeert elke driehoek naar
 *  front/back/sleeveLeft/sleeveRight, puur op wereldpositie (zie module-
 *  commentaar hierboven voor de as-conventie). Bouwt 4 losse BufferGeometry's
 *  — gecentreerd en genormaliseerd naar TARGET_HEIGHT — zodat de camera-fit
 *  hieronder met elk model dezelfde afstanden kan gebruiken. */
function splitAndClassify(root) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  if (!meshes.length) throw new Error('Geen mesh gevonden in tshirt.glb');

  const perMesh = meshes.map((mesh) => {
    const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const posAttr = source.getAttribute('position');
    const normAttr = source.getAttribute('normal');
    const uvAttr = source.getAttribute('uv');
    const matrixWorld = mesh.matrixWorld;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrixWorld);
    const worldPositions = new Float32Array(posAttr.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i).applyMatrix4(matrixWorld);
      worldPositions[i * 3] = v.x; worldPositions[i * 3 + 1] = v.y; worldPositions[i * 3 + 2] = v.z;
    }
    const disposeSource = source !== mesh.geometry ? source : null;
    return { posAttr, normAttr, uvAttr, worldPositions, normalMatrix, disposeSource };
  });

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  perMesh.forEach(({ posAttr, worldPositions }) => {
    for (let i = 0; i < posAttr.count; i++) {
      const x = worldPositions[i * 3], y = worldPositions[i * 3 + 1], z = worldPositions[i * 3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  });
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const halfWidthX = (maxX - minX) / 2;
  const hemCutoffY = minY + HEM_Y_FRACTION * (maxY - minY);
  const rawHeight = maxY - minY;
  const scale = rawHeight > 0 ? TARGET_HEIGHT / rawHeight : 1;

  const buckets = {
    front: { positions: [], normals: [], uvs: [] },
    back: { positions: [], normals: [], uvs: [] },
    sleeveLeft: { positions: [], normals: [], uvs: [] },
    sleeveRight: { positions: [], normals: [], uvs: [] },
  };

  const n = new THREE.Vector3();
  perMesh.forEach(({ posAttr, normAttr, uvAttr, worldPositions, normalMatrix }) => {
    const triCount = posAttr.count / 3;
    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3, i1 = t * 3 + 1, i2 = t * 3 + 2;
      const cx = (worldPositions[i0 * 3] + worldPositions[i1 * 3] + worldPositions[i2 * 3]) / 3;
      const cy = (worldPositions[i0 * 3 + 1] + worldPositions[i1 * 3 + 1] + worldPositions[i2 * 3 + 1]) / 3;
      const cz = (worldPositions[i0 * 3 + 2] + worldPositions[i1 * 3 + 2] + worldPositions[i2 * 3 + 2]) / 3;
      const dx = cx - centerX;
      let zone;
      if (Math.abs(dx) > SLEEVE_X_FRACTION * halfWidthX && cy > hemCutoffY) {
        zone = dx < 0 ? 'sleeveLeft' : 'sleeveRight';
      } else {
        zone = cz > centerZ ? 'front' : 'back';
      }
      const bucket = buckets[zone];
      for (const i of [i0, i1, i2]) {
        bucket.positions.push(
          (worldPositions[i * 3] - centerX) * scale,
          (worldPositions[i * 3 + 1] - minY) * scale,
          (worldPositions[i * 3 + 2] - centerZ) * scale,
        );
        if (normAttr) { n.fromBufferAttribute(normAttr, i).applyMatrix3(normalMatrix).normalize(); bucket.normals.push(n.x, n.y, n.z); }
        if (uvAttr) bucket.uvs.push(uvAttr.getX(i), uvAttr.getY(i));
      }
    }
  });

  const geometries = {};
  Object.keys(buckets).forEach((zone) => {
    const g = new THREE.BufferGeometry();
    const b = buckets[zone];
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.positions, 3));
    if (b.normals.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(b.normals, 3));
    else g.computeVertexNormals();
    if (b.uvs.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uvs, 2));
    geometries[zone] = g;
  });

  perMesh.forEach(({ disposeSource }) => disposeSource?.dispose());
  return {
    geometries,
    height: rawHeight * scale,
    width: halfWidthX * 2 * scale,
    depth: (maxZ - minZ) * scale,
  };
}

export function createShirtViewer(canvas, opts = {}) {
  const { onArtworkDrag, onNameDrag } = opts;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.75;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.88;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  // LET OP: Object3D.add() geeft this (de ouder) terug, niet het kind — dus
  // NIET .add(x).position.set(...) chainen (dat verplaatst per ongeluk scene
  // zelf, met alle wereldposities van kinderen als gevolg).
  const keyLight = new THREE.DirectionalLight(0xfff2e0, 2.4);
  keyLight.position.set(3, 4, 3);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x9db8ff, 0.9);
  fillLight.position.set(-4, 1.5, -3);
  scene.add(fillLight);
  scene.add(new THREE.AmbientLight(0x404040, 0.4));

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad; sctx.fillRect(0, 0, 256, 256);
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  const PRESETS = {
    front: { theta: 0, phi: 1.3 },
    back: { theta: Math.PI, phi: 1.3 },
  };

  let modelRoot = null;
  let bodyCanvas, bodyCtx, bodyTexture, bodyMaterial;
  let frontMesh = null;
  let backMesh = null;
  // Eén "frame" (midden/oriëntatie/afmeting in wereldruimte) per kant — nodig
  // om zowel de DecalGeometry te bouwen als om een sleepbeweging (muispositie
  // op het canvas) om te rekenen naar dezelfde -0.5..0.5-canvasfractie die de
  // Horizontaal/Verticaal-sliders al gebruikten.
  const decalFrames = { front: null, back: null };
  // Logo en naam zijn elk twee losse, altijd-aanwezige decals (front + back).
  // Alleen de kant die daadwerkelijk actief is, is zichtbaar/beschilderd —
  // dit voorkomt dat een decal-mesh op- en afgebroken moet worden zodra de
  // klant van kant wisselt (die blijft gewoon "op zijn kant" hangen, ook als
  // de camera net naar de andere kant kijkt).
  const logoLayers = { front: null, back: null };
  const nameLayers = { front: null, back: null };
  let logoState = null; // { img, transform:{x,y,scale,rotation}, placement }
  let nameState = null; // { text, color, fontCss, fontScale, transform:{x,y}, placement }
  let camRadius = 3, camTargetY = 0.5, camAnim = null;
  let shirtHeight = TARGET_HEIGHT;

  function repaintBody(hex) {
    if (!bodyCtx) return;
    bodyCtx.setTransform(1, 0, 0, 1, 0, 0);
    bodyCtx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
    bodyCtx.fillStyle = hex || '#101114';
    bodyCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
    bodyTexture.needsUpdate = true;
  }

  function drawCoverImage(ctx, W, H, img, t) {
    const base = Math.max(W / img.width, H / img.height);
    const s = base * (t.scale ?? 1);
    const w = img.width * s, h = img.height * s;
    ctx.save();
    ctx.translate(W / 2 + (t.x ?? 0) * W, H / 2 + (t.y ?? 0) * H);
    ctx.rotate(((t.rotation ?? 0) * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawName(ctx, W, H, opts, t) {
    if (!opts || !opts.text) return;
    const label = opts.text.toUpperCase();
    const base = opts.color || '#FFFFFF';
    const fontSize = Math.round(H * 0.09 * (opts.fontScale ?? 1));
    ctx.font = (opts.fontCss || '800 {size}px Inter, system-ui, sans-serif').replace('{size}', fontSize);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = W / 2 + ((t?.x) ?? 0) * W;
    const y = H / 2 + ((t?.y) ?? 0.32) * H;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(label, x + fontSize * 0.035, y + fontSize * 0.05);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, fontSize * 0.05);
    ctx.strokeStyle = shadeColor(base, -0.45);
    ctx.strokeText(label, x, y);
    ctx.fillStyle = base;
    ctx.fillText(label, x, y);
  }

  function repaintLogo() {
    ['front', 'back'].forEach((side) => {
      const L = logoLayers[side];
      if (!L) return;
      L.ctx.setTransform(1, 0, 0, 1, 0, 0);
      L.ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
      const active = !!(logoState && logoState.placement === side);
      if (active) drawCoverImage(L.ctx, TEX_SIZE, TEX_SIZE, logoState.img, logoState.transform);
      L.texture.needsUpdate = true;
      L.mesh.visible = active;
    });
  }

  function repaintName() {
    ['front', 'back'].forEach((side) => {
      const N = nameLayers[side];
      if (!N) return;
      N.ctx.setTransform(1, 0, 0, 1, 0, 0);
      N.ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
      const active = !!(nameState && nameState.placement === side && nameState.text);
      if (active) drawName(N.ctx, TEX_SIZE, TEX_SIZE, nameState, nameState.transform);
      N.texture.needsUpdate = true;
      N.mesh.visible = active;
    });
  }

  /** Wereldruimte-"frame" (midden/oriëntatie/afmeting) van het projectievlak
   *  voor één kant — zelfde box-op-basis-van-de-lokale-bounding-box-techniek
   *  als voorheen (bewust géén Box3.setFromObject, zie de toelichting bij
   *  fitCameraToObject hieronder). `dir` is de kant waarheen het decalvak
   *  geprojecteerd wordt: +1 voor front (richting +Z), -1 voor back. */
  function computeFrame(mesh, dir) {
    const box = mesh.geometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const decalSize = new THREE.Vector3(size.x * 0.7, size.y * 0.55, Math.max(size.z, 0.2));
    const decalCenter = new THREE.Vector3(center.x, center.y + size.y * 0.08, center.z);
    const orient = new THREE.Object3D();
    orient.position.copy(decalCenter);
    orient.lookAt(decalCenter.clone().add(new THREE.Vector3(0, 0, dir)));
    const normal = new THREE.Vector3(0, 0, dir);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, decalCenter);
    return { center: decalCenter, orient, size: decalSize, plane, quatInv: orient.quaternion.clone().invert() };
  }

  /** Bouwt één (aanvankelijk lege/onzichtbare) decal-mesh geprojecteerd op
   *  ALLEEN de opgegeven kant-mesh (dus nooit lekkend naar de rug/mouwen),
   *  zelfde DecalGeometry-techniek als de handschoen se front-panel-artwork.
   *  `polyOffset` houdt logo- en naam-decals op dezelfde kant uit elkaars
   *  z-fighting (naam iets dichter bij de camera getekend dan het logo). */
  function buildDecalMesh(mesh, frame, polyOffset) {
    const c = document.createElement('canvas');
    c.width = c.height = TEX_SIZE;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshPhysicalMaterial({
      map: tex, transparent: true, depthTest: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: polyOffset,
      roughness: MATERIAL_DEFAULTS.roughness, metalness: MATERIAL_DEFAULTS.metalness,
      clearcoat: MATERIAL_DEFAULTS.clearcoat, clearcoatRoughness: MATERIAL_DEFAULTS.clearcoatRoughness,
      envMapIntensity: MATERIAL_DEFAULTS.envMapIntensity,
    });
    const geo = new DecalGeometry(mesh, frame.center, frame.orient.rotation, frame.size);
    const dm = new THREE.Mesh(geo, material);
    dm.renderOrder = polyOffset < -4 ? 7 : 6;
    dm.visible = false;
    scene.add(dm);
    return { canvas: c, ctx, texture: tex, mesh: dm };
  }

  // Neemt de al analytisch bekende afmetingen uit splitAndClassify aan i.p.v.
  // Box3.setFromObject(modelRoot) — die laatste bleek in dit rendertraject een
  // matrixWorld terug te geven die niet overeenkwam met de werkelijke lokale
  // posities (mesh.position stond op [0,0,0], maar de doorgerekende
  // matrixWorld bevatte toch een verschuiving). De geometrie wordt al
  // gecentreerd/genormaliseerd opgebouwd in splitAndClassify, dus de afmetingen
  // zijn daar al exact bekend — geen Box3-afhankelijkheid nodig.
  function fitCameraToObject(size) {
    const extent = Math.max(size.width, size.height, size.depth);
    // 2.4× i.p.v. de 1.85× van de handschoen: die is bijna kubisch, het shirt
    // is smal en hoog, dus is `extent` hier altijd de hoogte. Bij 1.85–2.0×
    // liep de zoom door het perspectief (de voorkant staat dichter bij de
    // camera dan het middelpunt) onderaan uit het kader. 2.4× houdt het hele
    // shirt met marge in beeld; de zoomgrenzen hieronder staan in dezelfde
    // verhouding tot de startafstand als bij de handschoen.
    camRadius = extent * 2.4;
    camTargetY = size.height * 0.5;
    controls.target.set(0, camTargetY, 0);
    controls.minDistance = extent * 0.9;
    controls.maxDistance = extent * 3.9;
    camera.near = extent * 0.01;
    camera.far = extent * 40;
    camera.updateProjectionMatrix();
    goToPreset('front', 0);
    // PlaneGeometry(2,2) → schaal s geeft breedte 2s; iets breder dan het
    // shirt zelf, anders wordt het een donkere vlek over het hele kader.
    shadowMesh.scale.setScalar(Math.max(size.width, size.depth) * 0.6);
    shadowMesh.position.y = 0.001;
  }

  function goToPreset(name, duration = 650) {
    const p = PRESETS[name] || PRESETS.front;
    const toPos = new THREE.Vector3()
      .setFromSpherical(new THREE.Spherical(camRadius, p.phi, p.theta))
      .add(controls.target);
    const toTarget = new THREE.Vector3(0, camTargetY, 0);
    if (duration <= 0) {
      camera.position.copy(toPos); controls.target.copy(toTarget); controls.update(); return;
    }
    camAnim = { fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget, t0: performance.now(), dur: duration };
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  function disposeDecalLayer(L) {
    if (!L) return;
    scene.remove(L.mesh);
    L.mesh.geometry.dispose();
    L.mesh.material.dispose();
    L.texture.dispose();
  }

  function disposeModel() {
    disposeDecalLayer(logoLayers.front); disposeDecalLayer(logoLayers.back);
    disposeDecalLayer(nameLayers.front); disposeDecalLayer(nameLayers.back);
    logoLayers.front = logoLayers.back = nameLayers.front = nameLayers.back = null;
    if (modelRoot) {
      scene.remove(modelRoot);
      modelRoot.traverse((o) => { if (o.isMesh) o.geometry?.dispose(); });
      bodyMaterial?.map?.dispose();
      bodyMaterial?.dispose();
      modelRoot = null;
    }
  }

  const readyPromise = new Promise((resolve, reject) => {
    loader.load(MODEL_URL, (gltf) => {
      const { geometries, height, width, depth } = splitAndClassify(gltf.scene);
      shirtHeight = height;

      bodyCanvas = document.createElement('canvas');
      bodyCanvas.width = bodyCanvas.height = TEX_SIZE;
      bodyCtx = bodyCanvas.getContext('2d');
      bodyTexture = new THREE.CanvasTexture(bodyCanvas);
      bodyTexture.colorSpace = THREE.SRGBColorSpace;
      bodyMaterial = new THREE.MeshPhysicalMaterial({
        map: bodyTexture, color: 0xffffff,
        roughness: MATERIAL_DEFAULTS.roughness, metalness: MATERIAL_DEFAULTS.metalness,
        clearcoat: MATERIAL_DEFAULTS.clearcoat, clearcoatRoughness: MATERIAL_DEFAULTS.clearcoatRoughness,
        envMapIntensity: MATERIAL_DEFAULTS.envMapIntensity,
      });
      repaintBody('#101114');

      modelRoot = new THREE.Group();
      // ÉÉN gedeeld materiaal voor front + back + beide mouwen: garandeert dat
      // een kleurwissel overal tegelijk en identiek doorkomt, nooit een mouw
      // die achterblijft op de oude kleur.
      ['front', 'back', 'sleeveLeft', 'sleeveRight'].forEach((zone) => {
        const geo = geometries[zone];
        geo.computeBoundingSphere();
        geo.computeBoundingBox();
        const mesh = new THREE.Mesh(geo, bodyMaterial);
        mesh.castShadow = true; mesh.receiveShadow = true;
        modelRoot.add(mesh);
        if (zone === 'front') frontMesh = mesh;
        if (zone === 'back') backMesh = mesh;
      });
      scene.add(modelRoot);
      fitCameraToObject({ width, height, depth });

      decalFrames.front = computeFrame(frontMesh, 1);
      decalFrames.back = computeFrame(backMesh, -1);
      logoLayers.front = buildDecalMesh(frontMesh, decalFrames.front, -4);
      logoLayers.back = buildDecalMesh(backMesh, decalFrames.back, -4);
      nameLayers.front = buildDecalMesh(frontMesh, decalFrames.front, -5);
      nameLayers.back = buildDecalMesh(backMesh, decalFrames.back, -5);

      resolve();
    }, undefined, reject);
  });

  const setShirtColor = (hex) => { repaintBody(hex); renderNow(); };

  const setArtwork = (img, transform, placement) => {
    logoState = img ? {
      img,
      transform: transform || defaultTransform(),
      placement: placement || logoState?.placement || 'front',
    } : null;
    repaintLogo();
    renderNow();
  };
  const setArtworkTransform = (transform) => {
    if (!logoState) return;
    logoState.transform = transform;
    repaintLogo();
    renderNow();
  };
  const setArtworkPlacement = (placement) => {
    if (!logoState) return;
    logoState.placement = placement;
    repaintLogo();
    renderNow();
  };
  function defaultTransform() { return { x: 0, y: 0, scale: 1, rotation: 0 }; }

  const setName = (opts, placement, transform) => {
    nameState = (opts && opts.text) ? {
      ...opts,
      transform: transform || nameState?.transform || { x: 0, y: 0.32 },
      placement: placement || nameState?.placement || 'front',
    } : null;
    repaintName();
    renderNow();
  };
  const setNameTransform = (transform) => {
    if (!nameState) return;
    nameState.transform = transform;
    repaintName();
    renderNow();
  };
  const setNamePlacement = (placement) => {
    if (!nameState) return;
    nameState.placement = placement;
    repaintName();
    renderNow();
  };

  function getArtworkCanvas(zone, size = 2048) {
    const hasLogo = !!(logoState && logoState.placement === zone);
    const hasName = !!(nameState && nameState.placement === zone && nameState.text);
    if (!hasLogo && !hasName) return null;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    if (hasLogo) drawCoverImage(ctx, size, size, logoState.img, logoState.transform);
    if (hasName) drawName(ctx, size, size, nameState, nameState.transform);
    return c;
  }

  function captureHighResPNG({ width = 1600, height = 1600, preset } = {}) {
    const prevPixelRatio = renderer.getPixelRatio();
    if (preset) goToPreset(preset, 0);
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderNow();
    const dataUrl = canvas.toDataURL('image/png');
    renderer.setPixelRatio(prevPixelRatio);
    resize();
    renderNow();
    return dataUrl;
  }

  function zoom(factor) {
    const dir = camera.position.clone().sub(controls.target);
    const dist = THREE.MathUtils.clamp(dir.length() * factor, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(dir.setLength(dist));
    controls.update();
    renderNow();
  }

  function resize() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth, h = parent.clientHeight;
    if (w === 0 || h === 0) return false;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    return true;
  }

  function renderNow() {
    if (camAnim) { camera.position.copy(camAnim.toPos); controls.target.copy(camAnim.toTarget); camAnim = null; }
    controls.update();
    renderer.render(scene, camera);
  }

  /* ═══ SLEPEN: logo en naam onafhankelijk verslepen op het canvas ═════════
     Raycast tegen de echte front/back-mesh (die respecteert automatisch
     FrontSide-culling, dus je pakt altijd de kant op die je op dat moment
     ziet). Het rakingspunt wordt omgerekend naar dezelfde -0.5..0.5-
     canvasfractie die transform.x/y ook al gebruiken (zelfde wiskunde als
     DecalGeometry zelf gebruikt om de UV's te genereren, zie computeFrame/
     buildDecalMesh) — zo blijft de gesleepte laag exact onder de cursor en
     kan hij nooit buiten de al bestaande artwork-projectiezone (dezelfde
     zone die de Horizontaal/Verticaal-sliders gebruiken) terechtkomen. */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const dragPoint = new THREE.Vector3();
  let drag = null; // { kind:'logo'|'name', side:'front'|'back', frame }

  function pointerToNDC(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function localFraction(frame, worldPoint) {
    const local = worldPoint.clone().sub(frame.center).applyQuaternion(frame.quatInv);
    return { x: local.x / frame.size.x, y: -local.y / frame.size.y };
  }

  function pickLayerAt(tx, ty, side) {
    if (nameState && nameState.placement === side) {
      const t = nameState.transform;
      if (Math.max(Math.abs(tx - t.x), Math.abs(ty - t.y)) <= HIT_RADIUS) return 'name';
    }
    if (logoState && logoState.placement === side) {
      const t = logoState.transform;
      if (Math.max(Math.abs(tx - t.x), Math.abs(ty - t.y)) <= HIT_RADIUS) return 'logo';
    }
    return null;
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    pointerToNDC(e);
    raycaster.setFromCamera(ndc, camera);
    const targets = [frontMesh, backMesh].filter(Boolean);
    if (!targets.length) return;
    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) return;
    const side = hits[0].object === frontMesh ? 'front' : 'back';
    const frame = decalFrames[side];
    const { x: tx, y: ty } = localFraction(frame, hits[0].point);
    const kind = pickLayerAt(tx, ty, side);
    if (!kind) return; // niets geraakt: laat OrbitControls gewoon draaien
    drag = { kind, side, frame };
    controls.enabled = false;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* niet kritiek */ }
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag) return;
    pointerToNDC(e);
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(drag.frame.plane, dragPoint)) return;
    const frac = localFraction(drag.frame, dragPoint);
    const t = { x: clampUnit(frac.x), y: clampUnit(frac.y) };
    if (drag.kind === 'logo' && logoState) {
      logoState.transform = { ...logoState.transform, x: t.x, y: t.y };
      repaintLogo();
      onArtworkDrag?.({ ...logoState.transform });
    } else if (drag.kind === 'name' && nameState) {
      nameState.transform = t;
      repaintName();
      onNameDrag?.({ ...nameState.transform });
    }
    renderNow();
    e.preventDefault();
  }

  function endDrag(e) {
    if (!drag) return;
    if (e?.pointerId !== undefined) { try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* niet kritiek */ } }
    drag = null;
    controls.enabled = true;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    clock.getDelta();
    if (camAnim) {
      const t = Math.min(1, (performance.now() - camAnim.t0) / camAnim.dur);
      const e = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, e);
      controls.target.lerpVectors(camAnim.fromTarget, camAnim.toTarget, e);
      if (t >= 1) camAnim = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  try { new ResizeObserver(() => resize()).observe(canvas.parentElement); } catch (e) { /* window-resize vangt dit op */ }
  window.addEventListener('resize', resize);
  let tries = 0;
  (function poll() { if (!resize() && tries++ < 30) requestAnimationFrame(poll); })();
  requestAnimationFrame(animate);

  return {
    ready: readyPromise,
    setShirtColor,
    setArtwork,
    setArtworkTransform,
    setArtworkPlacement,
    setName,
    setNameTransform,
    setNamePlacement,
    getArtworkCanvas,
    captureHighResPNG,
    goToPreset,
    zoom,
    resize,
    renderNow,
    get height() { return shirtHeight; },
  };
}
