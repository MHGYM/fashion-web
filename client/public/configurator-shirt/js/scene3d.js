/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — 3D T-shirt Viewer (Three.js)
   ═══════════════════════════════════════════════════════════════════════════
   Zelfde architectuur als client/public/configurator/js/scene3d.js (bokshand-
   schoen): canvas-textuur voor kleur, DecalGeometry voor een geüpload
   logo/ontwerp op de voorkant, dezelfde matte materiaal-receptuur, dezelfde
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
  let frontArtwork = null; // { state:{img,transform,name}, canvas, ctx, texture, mesh }
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

  function drawName(ctx, W, H, opts) {
    if (!opts || !opts.text) return;
    const label = opts.text.toUpperCase();
    const base = opts.color || '#FFFFFF';
    const fontSize = Math.round(H * 0.09 * (opts.fontScale ?? 1));
    ctx.font = (opts.fontCss || '800 {size}px Inter, system-ui, sans-serif').replace('{size}', fontSize);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = H * (opts.y ?? 0.82);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(label, W / 2 + fontSize * 0.035, y + fontSize * 0.05);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, fontSize * 0.05);
    ctx.strokeStyle = shadeColor(base, -0.45);
    ctx.strokeText(label, W / 2, y);
    ctx.fillStyle = base;
    ctx.fillText(label, W / 2, y);
  }

  function repaintFrontArtwork() {
    if (!frontArtwork) return;
    const { ctx, canvas: c, state } = frontArtwork;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    if (state?.img) drawCoverImage(ctx, c.width, c.height, state.img, state.transform);
    if (state?.name) drawName(ctx, c.width, c.height, state.name);
    frontArtwork.texture.needsUpdate = true;
    frontArtwork.mesh.visible = !!(state?.img || state?.name?.text);
  }

  /** Decal geprojecteerd op ALLEEN de front-zone-mesh (dus nooit op de rug of
   *  mouwen, ongeacht boxgrootte) — zelfde DecalGeometry-techniek als de
   *  handschoen se front-panel-artwork, maar hier één enkel doelvlak i.p.v.
   *  een groep meshes. */
  function buildFrontDecal(mesh) {
    // Lokale geometry-bounds i.p.v. Box3.setFromObject(mesh) — zie de
    // toelichting bij fitCameraToObject hierboven; mesh.position is hier
    // altijd identity, dus lokaal == wereldruimte voor dit doel.
    const box = mesh.geometry.boundingBox;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const decalSize = new THREE.Vector3(size.x * 0.7, size.y * 0.55, Math.max(size.z, 0.2));
    const decalCenter = new THREE.Vector3(center.x, center.y + size.y * 0.08, center.z);
    const orient = new THREE.Object3D();
    orient.position.copy(decalCenter);
    orient.lookAt(decalCenter.clone().add(new THREE.Vector3(0, 0, 1)));

    const c = document.createElement('canvas');
    c.width = c.height = TEX_SIZE;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshPhysicalMaterial({
      map: tex, transparent: true, depthTest: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4,
      roughness: MATERIAL_DEFAULTS.roughness, metalness: MATERIAL_DEFAULTS.metalness,
      clearcoat: MATERIAL_DEFAULTS.clearcoat, clearcoatRoughness: MATERIAL_DEFAULTS.clearcoatRoughness,
      envMapIntensity: MATERIAL_DEFAULTS.envMapIntensity,
    });
    const geo = new DecalGeometry(mesh, decalCenter, orient.rotation, decalSize);
    const dm = new THREE.Mesh(geo, material);
    dm.renderOrder = 6;
    dm.visible = false;
    scene.add(dm);
    return { state: null, canvas: c, ctx, texture: tex, mesh: dm };
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
    camRadius = extent * 2.0;
    camTargetY = size.height * 0.52;
    controls.target.set(0, camTargetY, 0);
    controls.minDistance = extent * 0.7;
    controls.maxDistance = extent * 3.2;
    camera.near = extent * 0.01;
    camera.far = extent * 40;
    camera.updateProjectionMatrix();
    goToPreset('front', 0);
    shadowMesh.scale.setScalar(Math.max(size.width, size.depth) * 1.6);
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

  function disposeModel() {
    if (frontArtwork) { scene.remove(frontArtwork.mesh); frontArtwork.mesh.geometry.dispose(); frontArtwork.material?.dispose(); frontArtwork.texture.dispose(); frontArtwork = null; }
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
      });
      scene.add(modelRoot);
      fitCameraToObject({ width, height, depth });

      frontArtwork = buildFrontDecal(frontMesh);

      resolve();
    }, undefined, reject);
  });

  const setShirtColor = (hex) => { repaintBody(hex); renderNow(); };

  const setArtwork = (img, transform) => {
    if (!frontArtwork) return;
    frontArtwork.state = { ...(frontArtwork.state || {}), img, transform: transform || { x: 0, y: 0, scale: 1, rotation: 0 } };
    repaintFrontArtwork();
    renderNow();
  };
  const setArtworkTransform = (transform) => {
    if (!frontArtwork?.state) return;
    frontArtwork.state.transform = transform;
    repaintFrontArtwork();
    renderNow();
  };
  const setName = (opts) => {
    if (!frontArtwork) return;
    frontArtwork.state = { ...(frontArtwork.state || {}), name: opts };
    repaintFrontArtwork();
    renderNow();
  };

  function getArtworkCanvas(size = 2048) {
    if (!frontArtwork?.state || (!frontArtwork.state.img && !frontArtwork.state.name?.text)) return null;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    if (frontArtwork.state.img) drawCoverImage(ctx, size, size, frontArtwork.state.img, frontArtwork.state.transform);
    if (frontArtwork.state.name) drawName(ctx, size, size, frontArtwork.state.name);
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
    setName,
    getArtworkCanvas,
    captureHighResPNG,
    goToPreset,
    zoom,
    resize,
    renderNow,
    get height() { return shirtHeight; },
  };
}
