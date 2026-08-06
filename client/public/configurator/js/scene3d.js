/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — 3D Glove Viewer (Three.js)
   ═══════════════════════════════════════════════════════════════════════════
   Twee soorten kleurbare zones:
   - MESH_ZONES: bestaan als losse, benoemde 3D-objecten in de GLB (echte
     materialen — top-panel, front-panel, palm, palm-back, outer-thumb,
     inner-thumb, wrist). Kleur = mesh.material.color, vloeiend geanimeerd.
   - DECAL_ZONES: bestaan NIET als aparte geometrie in de scan (trim, piping,
     laces, stitching, logo, naam). Elke zone krijgt een THREE.DecalGeometry
     geprojecteerd op de dichtstbijzijnde échte oppervlaktepositie van een
     gekozen basis-mesh, met een dynamisch <canvas>-texture als materiaal —
     live herkleurbaar/herschrijfbaar zonder de geometrie opnieuw te bouwen
     en zonder dat het onderliggende scan-model UV's nodig heeft.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { DecalGeometry } from './vendor/three/addons/geometries/DecalGeometry.js';
import { RoomEnvironment } from './vendor/three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from './vendor/three/addons/libs/meshopt_decoder.module.js';

const MODEL_URL = 'assets/boxing_glove_segmented.glb';

export const MESH_ZONES = ['top-panel', 'front-panel', 'palm', 'palm-back', 'outer-thumb', 'inner-thumb', 'wrist'];
export const DECAL_ZONES = ['piping', 'trim', 'laces', 'stitching', 'logo', 'name'];

// Elke decal-zone: op welk echt mesh hij geprojecteerd wordt + waar op de
// bounding box van dát mesh (u,v,w = fractie 0..1 langs elke as). Geen
// aannames over wereld-assen nodig — het dichtstbijzijnde échte
// oppervlaktepunt op het GENOEMDE mesh wordt via brute-force gezocht.
// u = links/rechts, v = onder/boven, w = voor/achter — fracties (0..1) binnen
// de EIGEN bounding box van het aangewezen mesh. De meshes zijn niet symmetrisch
// rond het model-midden (duim/pols nemen een stuk van de breedte in), dus u=0.5
// is NIET automatisch het echte midden van de handschoen — onderstaande waarden
// zijn empirisch gekalibreerd tegen de werkelijke geometrie (zie devnotes).
const DECAL_ANCHORS = {
  piping:    { mesh: 'top-panel',   u: 0.30, v: 0.06, w: 0.55, size: [120, 14, 36] },
  trim:      { mesh: 'wrist',       u: 0.69, v: 0.14, w: 0.55, size: [120, 16, 36] },
  laces:     { mesh: 'front-panel', u: 0.28, v: 0.08, w: 0.55, size: [50, 32, 36] },
  stitching: { mesh: 'wrist',       u: 0.69, v: 0.88, w: 0.55, size: [120, 12, 36] },
  logo:      { mesh: 'front-panel', u: 0.28, v: 0.60, w: 0.55, size: [42, 42, 36] },
  name:      { mesh: 'front-panel', u: 0.28, v: 0.32, w: 0.55, size: [82, 18, 36] },
};

const COLOR_LERP_SPEED = 8; // hoger = snellere kleurovergang

/** Zoekt op een gegeven mesh het échte oppervlaktepunt (+normaal) dat het
 *  dichtst bij een doelpunt binnen zijn eigen bounding box ligt. Brute-force
 *  over alle driehoeken — draait eenmalig per decal bij het laden, dus de
 *  kosten (tot ~100k driehoeken) zijn verwaarloosbaar. */
function closestSurfacePoint(mesh, target) {
  const pos = mesh.geometry.attributes.position;
  const idx = mesh.geometry.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = new THREE.Triangle();
  const closest = new THREE.Vector3();
  let bestDist = Infinity, bestPoint = null, bestNormal = null;

  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const ia = idx ? idx.getX(i * 3) : i * 3;
    const ib = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    const ic = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
    a.fromBufferAttribute(pos, ia);
    b.fromBufferAttribute(pos, ib);
    c.fromBufferAttribute(pos, ic);
    tri.set(a, b, c);
    tri.closestPointToPoint(target, closest);
    const d = closest.distanceToSquared(target);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = closest.clone();
      bestNormal = tri.getNormal(new THREE.Vector3());
    }
  }
  // naar wereldcoördinaten (mesh heeft in onze scene een identity-achtige
  // transform, maar we passen 'm netjes toe voor het geval dat verandert)
  bestPoint.applyMatrix4(mesh.matrixWorld);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  bestNormal.applyMatrix3(normalMatrix).normalize();
  return { point: bestPoint, normal: bestNormal };
}

function anchorFromBoxFraction(mesh, u, v, w) {
  const box = new THREE.Box3().setFromObject(mesh);
  const target = new THREE.Vector3(
    THREE.MathUtils.lerp(box.min.x, box.max.x, u),
    THREE.MathUtils.lerp(box.min.y, box.max.y, v),
    THREE.MathUtils.lerp(box.min.z, box.max.z, w),
  );
  return closestSurfacePoint(mesh, target);
}

function orientationFromNormal(normal) {
  const dummy = new THREE.Object3D();
  dummy.position.set(0, 0, 0);
  dummy.lookAt(normal.clone());
  return dummy.rotation.clone();
}

/** Canvas-texture voor een decal-zone; wordt live herschreven bij kleurwijziging. */
function makeDecalCanvas(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, texture };
}

function drawDecal(kind, ctx, hex, extra) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  switch (kind) {
    case 'piping':
    case 'trim': {
      // volle, effen band — kleurvlak dat als bies/afwerkrand oogt
      ctx.fillStyle = hex;
      ctx.fillRect(0, h * 0.30, w, h * 0.40);
      break;
    }
    case 'stitching': {
      ctx.strokeStyle = hex;
      ctx.lineWidth = 10;
      ctx.setLineDash([22, 18]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      break;
    }
    case 'laces': {
      ctx.strokeStyle = hex;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      const rows = 4, top = h * 0.12, bottom = h * 0.88, cx = w / 2, spread = w * 0.28;
      for (let i = 0; i < rows; i++) {
        const y1 = top + (i / rows) * (bottom - top);
        const y2 = top + ((i + 1) / rows) * (bottom - top);
        ctx.beginPath(); ctx.moveTo(cx - spread, y1); ctx.lineTo(cx + spread, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + spread, y1); ctx.lineTo(cx - spread, y2); ctx.stroke();
      }
      ctx.fillStyle = '#0A0B0D';
      for (let i = 0; i <= rows; i++) {
        const y = top + (i / rows) * (bottom - top);
        ctx.beginPath(); ctx.arc(cx - spread, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + spread, y, 6, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'logo': {
      ctx.fillStyle = hex;
      ctx.save();
      ctx.translate(w / 2, h / 2 - 14);
      const s = 2.1;
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.rect(-27, -18, 20.5, 6.5);
      ctx.rect(-27, -18, 6.5, 31);
      ctx.rect(-17, -3, 15, 6.5);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(1, -18, 7.5, 31);
      ctx.moveTo(1, -18); ctx.lineTo(8.5, -18); ctx.lineTo(15.5, -5); ctx.lineTo(22.5, -18); ctx.lineTo(30, -18);
      ctx.lineTo(30, 13); ctx.lineTo(23, 13); ctx.lineTo(23, -3); ctx.lineTo(18.5, 5.5); ctx.lineTo(12.5, 5.5);
      ctx.lineTo(8, -3); ctx.lineTo(8, 13); ctx.lineTo(1, 13); ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = hex;
      ctx.font = '700 15px "Helvetica Neue", Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FIGHTMARKETING', w / 2, h / 2 + 46);
      break;
    }
    case 'name': {
      ctx.fillStyle = hex;
      ctx.font = '800 46px "Helvetica Neue", Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = (extra && extra.text) ? extra.text.toUpperCase() : 'YOUR NAME';
      ctx.fillText(text, w / 2, h / 2, w * 0.92);
      break;
    }
  }
  ctx.restore();
}

export function createGloveViewer(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 5000);
  camera.position.set(220, 140, 320);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.75;
  controls.minDistance = 160;
  controls.maxDistance = 620;
  controls.enablePan = false;
  controls.target.set(0, 20, 0);
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.88;

  // ── Premium studio-belichting ──────────────────────────────────────────
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xfff2e0, 2.4);
  key.position.set(180, 260, 200);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9db8ff, 0.9);
  fill.position.set(-220, 80, -160);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffd9a0, 1.4);
  rim.position.set(-60, 180, -280);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0x404040, 0.35));

  // Zachte contactschaduw onder het model (radiale gradient-textuur)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -0.5;
  scene.add(shadowMesh);

  const meshByZone = {};
  const decalMeshByZone = {};
  const decalCtxByZone = {};
  const targetColor = {};
  const glowGroup = new THREE.Group();
  scene.add(glowGroup);

  let modelRoot = null;
  let ready = false;
  let idleTimer = 0;
  let autoRotate = true;
  let camRadius = 420;
  let camTargetY = 0;
  let camAnim = null; // { fromPos, toPos, fromTarget, toTarget, t0, dur }

  const CAM_PRESETS = {
    front: { theta: 0.55,          phi: 1.18 },
    back:  { theta: Math.PI + 0.55, phi: 1.18 },
    top:   { theta: 0.55,          phi: 0.42 },
  };

  function fitCameraToObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    object.position.y += size.y / 2;
    camRadius = Math.max(size.x, size.y, size.z) * 1.65;
    camTargetY = size.y * 0.42;
    controls.target.set(0, camTargetY, 0);
    goToPreset('front', 0);
    shadowMesh.scale.setScalar(Math.max(size.x, size.z) / 180);
  }

  function sphericalPosition(theta, phi, radius) {
    const s = new THREE.Spherical(radius, phi, theta);
    return new THREE.Vector3().setFromSpherical(s).add(controls.target);
  }

  function goToPreset(name, duration = 650) {
    const preset = CAM_PRESETS[name] || CAM_PRESETS.front;
    const toPos = sphericalPosition(preset.theta, preset.phi, camRadius);
    const toTarget = new THREE.Vector3(0, camTargetY, 0);
    if (duration <= 0) {
      camera.position.copy(toPos);
      controls.target.copy(toTarget);
      controls.update();
      return;
    }
    camAnim = {
      fromPos: camera.position.clone(),
      toPos, fromTarget: controls.target.clone(), toTarget,
      t0: performance.now(), dur: duration,
    };
    autoRotate = false;
    idleTimer = 0;
  }

  function buildDecal(zone) {
    const anchor = DECAL_ANCHORS[zone];
    const baseMesh = meshByZone[anchor.mesh];
    if (!baseMesh) return;
    const { point, normal } = anchorFromBoxFraction(baseMesh, anchor.u, anchor.v, anchor.w);
    const orientation = orientationFromNormal(normal);
    const size = new THREE.Vector3(...anchor.size);
    const geometry = new DecalGeometry(baseMesh, point, orientation, size);

    const { canvas, ctx, texture } = makeDecalCanvas(zone);
    decalCtxByZone[zone] = { ctx, texture, canvas };

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      roughness: 0.55,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 10;
    scene.add(mesh);
    decalMeshByZone[zone] = mesh;
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const readyPromise = new Promise((resolve, reject) => {
    loader.load(
      opts.modelUrl || MODEL_URL,
      (gltf) => {
        modelRoot = gltf.scene;
        modelRoot.scale.setScalar(1);

        MESH_ZONES.forEach((zone) => {
          const obj = modelRoot.getObjectByName(zone);
          if (!obj) { console.warn('[3D] zone-mesh niet gevonden:', zone); return; }
          const mat = new THREE.MeshPhysicalMaterial({
            color: 0x14161a,
            roughness: 0.5,
            metalness: 0.02,
            clearcoat: 0.18,
            clearcoatRoughness: 0.32,
            envMapIntensity: 1.0,
          });
          obj.material = mat;
          meshByZone[zone] = obj;
          targetColor[zone] = new THREE.Color(mat.color.getHex());
        });

        scene.add(modelRoot);
        fitCameraToObject(modelRoot);
        // fitCameraToObject verschuift object.position, maar matrixWorld wordt
        // pas bij de eerstvolgende render herberekend. De decal-ankers hieronder
        // hebben de bijgewerkte wereldmatrix nodig (Box3/raycasts tegen elk
        // mesh) — forceer dus een synchrone update vóórdat we ze berekenen.
        modelRoot.updateMatrixWorld(true);

        DECAL_ZONES.forEach((zone) => {
          try { buildDecal(zone); } catch (e) { console.warn('[3D] decal-opbouw mislukt:', zone, e); }
        });

        // subtiele intro: model schaalt/fade-t soepel in via de render-loop.
        // Veiligheidsnet: mocht requestAnimationFrame om wat voor reden dan
        // ook niet tikken (bijv. een achtergrond-/onzichtbare tab die de
        // browser bewust pauzeert), dan garandeert deze timer alsnog dat het
        // model zichtbaar wordt i.p.v. voor altijd op schaal 0 te blijven staan.
        modelRoot.scale.setScalar(0.001);
        glowGroup.userData.introStart = performance.now();
        resize();
        setTimeout(() => {
          if (modelRoot.scale.x < 0.999) {
            modelRoot.scale.setScalar(1);
            renderer.render(scene, camera);
          }
        }, 1200);
        ready = true;
        resolve();
      },
      undefined,
      (err) => reject(err),
    );
  });

  function setZoneColor(zone, hex) {
    if (!meshByZone[zone]) return;
    targetColor[zone] = new THREE.Color(hex);
    autoRotate = false;
    idleTimer = 0;
  }

  function setDecalColor(zone, hex, extra) {
    const d = decalCtxByZone[zone];
    if (!d) return;
    drawDecal(zone, d.ctx, hex, extra);
    d.texture.needsUpdate = true;
    autoRotate = false;
    idleTimer = 0;
  }

  function setDecalImage(zone, img) {
    const d = decalCtxByZone[zone];
    const meshEntry = decalMeshByZone[zone];
    if (!d || !meshEntry) return;
    const { ctx, canvas, texture } = d;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.82;
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    texture.needsUpdate = true;
  }

  function resize() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth, h = parent.clientHeight;
    if (w === 0 || h === 0) return false;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return true;
  }

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);

    MESH_ZONES.forEach((zone) => {
      const mesh = meshByZone[zone];
      if (!mesh || !targetColor[zone]) return;
      mesh.material.color.lerp(targetColor[zone], Math.min(1, dt * COLOR_LERP_SPEED));
    });

    if (modelRoot && modelRoot.scale.x < 0.999) {
      const t = Math.min(1, (performance.now() - glowGroup.userData.introStart) / 700);
      const eased = 1 - Math.pow(1 - t, 3);
      const s = THREE.MathUtils.lerp(0.001, 1, eased);
      modelRoot.scale.setScalar(s);
    }

    if (autoRotate && ready) {
      idleTimer += dt;
      if (idleTimer > 1.4) {
        modelRoot.rotation.y += dt * 0.18;
      }
    }

    if (camAnim) {
      const t = Math.min(1, (performance.now() - camAnim.t0) / camAnim.dur);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, eased);
      controls.target.lerpVectors(camAnim.fromTarget, camAnim.toTarget, eased);
      if (t >= 1) camAnim = null;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  controls.addEventListener('start', () => { autoRotate = false; });
  controls.addEventListener('end', () => { idleTimer = 0; autoRotate = true; });

  // Meerdere onafhankelijke triggers voor het formaat — sommige browser-
  ///omgevingscombinaties leveren geen (tijdige) ResizeObserver-callback op
  // een net ingevoegd element, dus vertrouwen we niet op één mechanisme:
  // ResizeObserver (containergrootte) + window-resize (fallback) + een korte
  // poll direct na start (vangt een 0×0-race bij de allereerste paint) + een
  // laatste aanroep zodra het model geladen is (gegarandeerd correct tegen
  // de tijd dat de gebruiker iets ziet).
  try {
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement);
  } catch (e) { /* ResizeObserver niet beschikbaar — window-resize vangt dit op */ }
  window.addEventListener('resize', resize);

  let pollTries = 0;
  const pollResize = () => {
    const ok = resize();
    pollTries++;
    if (!ok && pollTries < 30) requestAnimationFrame(pollResize);
  };
  pollResize();

  requestAnimationFrame(animate);

  return {
    ready: readyPromise,
    setZoneColor,
    setDecalColor,
    setDecalImage,
    goToPreset,
    resize,
    meshZones: MESH_ZONES,
    decalZones: DECAL_ZONES,
  };
}
