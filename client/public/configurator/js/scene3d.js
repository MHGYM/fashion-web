/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — 3D Glove Viewer (Three.js)
   ═══════════════════════════════════════════════════════════════════════════
   GENERIEKE renderer: kent géén enkele zone- of meshnaam. Alles komt uit het
   actieve model-profiel (model-profile.js). Een nieuw 3D-model vereist alleen
   een nieuw profiel — dit bestand blijft ongewijzigd.

   Publieke API (alles per zone-id uit zones.js):
     viewer.ready                 → Promise, resolvet zodra het model staat
     viewer.setZoneColor(id, hex) → kleurt de zone, ongeacht mesh/material/decal
     viewer.setZoneText(id, txt)  → tekst voor tekstzones (bv. 'name')
     viewer.setZoneImage(id, img) → afbeelding voor artwork-zones (bv. 'logo')
     viewer.goToPreset(name)      → camerastandpunt uit het profiel
     viewer.isZoneSupported(id)   → false als dit model de zone niet kan tonen
     viewer.getZoneSupport(id)    → { supported, type, reason }
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { DecalGeometry } from './vendor/three/addons/geometries/DecalGeometry.js';
import { RoomEnvironment } from './vendor/three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from './vendor/three/addons/libs/meshopt_decoder.module.js';

import PROFILE from './model-profile.js';
import { ZONE_IDS } from './zones.js';
import { painterFor } from './decal-painters.js';

const COLOR_LERP_SPEED = 8; // hoger = snellere kleurovergang
const DECAL_TEXTURE_SIZE = 256;

/** Zone-id's gegroepeerd op hoe het actieve model ze levert. */
function zonesByType(type) {
  return ZONE_IDS.filter((id) => PROFILE.bindings[id]?.type === type);
}

// ── Geometrie-hulpjes ────────────────────────────────────────────────────────

/**
 * Dichtstbijzijnde punt op het oppervlak van `mesh` bij wereldpunt `target`.
 * Werkt volledig in WERELDruimte (driehoeken worden getransformeerd) — het
 * model wordt namelijk verplaatst bij het inpassen, dus lokaal vergelijken
 * geeft systematisch verkeerde ankers.
 */
function closestSurfacePoint(mesh, target) {
  const pos = mesh.geometry.attributes.position;
  const idx = mesh.geometry.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = new THREE.Triangle();
  const closest = new THREE.Vector3();
  const m = mesh.matrixWorld;
  let bestDist = Infinity, bestPoint = null, bestNormal = null;

  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let i = 0; i < triCount; i++) {
    const ia = idx ? idx.getX(i * 3) : i * 3;
    const ib = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    const ic = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
    a.fromBufferAttribute(pos, ia).applyMatrix4(m);
    b.fromBufferAttribute(pos, ib).applyMatrix4(m);
    c.fromBufferAttribute(pos, ic).applyMatrix4(m);
    tri.set(a, b, c);
    tri.closestPointToPoint(target, closest);
    const d = closest.distanceToSquared(target);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = closest.clone();
      bestNormal = tri.getNormal(new THREE.Vector3());
    }
  }
  return { point: bestPoint, normal: bestNormal.normalize() };
}

/**
 * Ankerpunt uit een bounding-box-fractie. Snapt eerst naar een ECHT vertex:
 * de handschoen is sterk gekromd, dus een box-punt kan ver naast de vorm
 * liggen, waardoor verschillende fracties allemaal op dezelfde uitstekende
 * rand zouden landen.
 */
function anchorFromBoxFraction(mesh, u, v, w) {
  const box = new THREE.Box3().setFromObject(mesh);
  const target = new THREE.Vector3(
    THREE.MathUtils.lerp(box.min.x, box.max.x, u),
    THREE.MathUtils.lerp(box.min.y, box.max.y, v),
    THREE.MathUtils.lerp(box.min.z, box.max.z, w),
  );
  const pos = mesh.geometry.attributes.position;
  const p = new THREE.Vector3();
  const nearest = new THREE.Vector3();
  let bestD = Infinity;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const d = p.distanceToSquared(target);
    if (d < bestD) { bestD = d; nearest.copy(p); }
  }
  return closestSurfacePoint(mesh, nearest);
}

function orientationFromNormal(normal) {
  const dummy = new THREE.Object3D();
  dummy.lookAt(normal.clone());
  return dummy.rotation.clone();
}

// ── Viewer ───────────────────────────────────────────────────────────────────

export function createGloveViewer(canvas, opts = {}) {
  const profile = opts.profile || PROFILE;

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
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.88;

  // ── Studio-belichting ──────────────────────────────────────────────────
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

  // Zachte contactschaduw
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -0.5;
  scene.add(shadowMesh);

  // ── Zone-registers ─────────────────────────────────────────────────────
  const meshByNode = {};        // GLB-nodenaam → THREE.Mesh
  const zoneTargets = {};       // zone-id → { kind, material(s) | decal-context }
  const targetColor = {};       // zone-id → THREE.Color (voor vloeiende lerp)
  const zoneText = {};          // zone-id → laatst ingestelde tekst
  const zoneImage = {};         // zone-id → laatst ingestelde afbeelding

  let modelRoot = null;
  let camRadius = 420;
  let camTargetY = 0;
  let camAnim = null;

  const presets = profile.cameraPresets || {};

  function fitCameraToObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    object.position.y += size.y / 2;
    camRadius = Math.max(size.x, size.y, size.z) * 1.65;
    camTargetY = size.y * 0.42;
    controls.target.set(0, camTargetY, 0);
    goToPreset(Object.keys(presets)[0] || 'front', 0);
    shadowMesh.scale.setScalar(Math.max(size.x, size.z) / 180);
  }

  function goToPreset(name, duration = 650) {
    const preset = presets[name] || Object.values(presets)[0];
    if (!preset) return;
    const toPos = new THREE.Vector3()
      .setFromSpherical(new THREE.Spherical(camRadius, preset.phi, preset.theta))
      .add(controls.target);
    const toTarget = new THREE.Vector3(0, camTargetY, 0);
    if (duration <= 0) {
      camera.position.copy(toPos);
      controls.target.copy(toTarget);
      controls.update();
      return;
    }
    camAnim = {
      fromPos: camera.position.clone(), toPos,
      fromTarget: controls.target.clone(), toTarget,
      t0: performance.now(), dur: duration,
    };
  }

  function makeZoneMaterial() {
    const d = profile.materialDefaults || {};
    return new THREE.MeshPhysicalMaterial({
      color: 0x14161a,
      roughness: d.roughness ?? 0.5,
      metalness: d.metalness ?? 0.02,
      clearcoat: d.clearcoat ?? 0.18,
      clearcoatRoughness: d.clearcoatRoughness ?? 0.32,
      envMapIntensity: d.envMapIntensity ?? 1.0,
    });
  }

  /** Bouwt een geprojecteerde decal voor één zone volgens het profiel. */
  function buildDecalZone(zoneId, anchor) {
    const baseMesh = meshByNode[anchor.mesh];
    if (!baseMesh) {
      console.warn(`[3D] decal "${zoneId}": draagmesh "${anchor.mesh}" niet gevonden.`);
      return null;
    }
    const { point, normal } = anchorFromBoxFraction(baseMesh, anchor.u, anchor.v, anchor.w);
    const geometry = new DecalGeometry(
      baseMesh, point, orientationFromNormal(normal), new THREE.Vector3(...anchor.size),
    );

    const texCanvas = document.createElement('canvas');
    texCanvas.width = texCanvas.height = DECAL_TEXTURE_SIZE;
    const ctx = texCanvas.getContext('2d');
    const texture = new THREE.CanvasTexture(texCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
      map: texture, transparent: true, depthTest: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.55, metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 10;
    scene.add(mesh);
    return { ctx, texture, canvas: texCanvas, mesh };
  }

  /** Tekent een decal-zone opnieuw met huidige kleur/tekst/afbeelding. */
  function repaintDecal(zoneId, hex) {
    const t = zoneTargets[zoneId];
    if (!t || t.kind !== 'decal') return;
    const { ctx, texture, canvas: c } = t;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    const img = zoneImage[zoneId];
    if (img) {
      const scale = Math.min(c.width / img.width, c.height / img.height) * 0.82;
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
    } else {
      painterFor(zoneId)(ctx, hex, { text: zoneText[zoneId] });
    }
    ctx.restore();
    texture.needsUpdate = true;
  }

  // ── Model laden ────────────────────────────────────────────────────────
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const readyPromise = new Promise((resolve, reject) => {
    loader.load(profile.modelUrl, (gltf) => {
      modelRoot = gltf.scene;

      // Alle meshes indexeren op node-naam
      modelRoot.traverse((o) => { if (o.isMesh) meshByNode[o.name] = o; });

      // 1) mesh- en material-zones: eigen materiaalinstantie per zone, zodat
      //    kleuren nooit gedeeld worden (de GLB kan 1 materiaal delen).
      ZONE_IDS.forEach((zoneId) => {
        const b = profile.bindings[zoneId];
        if (!b) return;

        if (b.type === 'mesh') {
          const mesh = meshByNode[b.node];
          if (!mesh) { console.warn(`[3D] zone "${zoneId}": mesh "${b.node}" ontbreekt in het model.`); return; }
          const mat = makeZoneMaterial();
          mesh.material = mat;
          zoneTargets[zoneId] = { kind: 'mesh', materials: [mat] };
          targetColor[zoneId] = new THREE.Color(mat.color.getHex());

        } else if (b.type === 'material') {
          const mesh = meshByNode[b.node];
          if (!mesh) { console.warn(`[3D] zone "${zoneId}": mesh "${b.node}" ontbreekt in het model.`); return; }
          // Materiaalslot(en) met de opgegeven naam binnen dit mesh
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const hits = [];
          list.forEach((m, i) => {
            if (m && m.name === b.material) {
              const mat = makeZoneMaterial();
              mat.name = m.name;
              if (Array.isArray(mesh.material)) mesh.material[i] = mat; else mesh.material = mat;
              hits.push(mat);
            }
          });
          if (!hits.length) { console.warn(`[3D] zone "${zoneId}": materiaal "${b.material}" niet gevonden op "${b.node}".`); return; }
          zoneTargets[zoneId] = { kind: 'material', materials: hits };
          targetColor[zoneId] = new THREE.Color(hits[0].color.getHex());
        }
      });

      scene.add(modelRoot);
      fitCameraToObject(modelRoot);
      // fitCameraToObject verplaatst het model; matrixWorld moet bijgewerkt zijn
      // vóórdat we decal-ankers berekenen (die werken in wereldruimte).
      modelRoot.updateMatrixWorld(true);

      // 2) decal-zones — ná het inpassen, want ze hangen aan echte oppervlakken
      zonesByType('decal').forEach((zoneId) => {
        try {
          const built = buildDecalZone(zoneId, profile.bindings[zoneId].anchor);
          if (built) zoneTargets[zoneId] = { kind: 'decal', ...built };
        } catch (e) {
          console.warn(`[3D] decal-opbouw mislukt voor "${zoneId}":`, e);
        }
      });

      // Intro-animatie + veiligheidsnet (zie animate()).
      modelRoot.scale.setScalar(0.001);
      modelRoot.userData.introStart = performance.now();
      resize();
      setTimeout(() => {
        if (modelRoot.scale.x < 0.999) {
          modelRoot.scale.setScalar(1);
          renderer.render(scene, camera);
        }
      }, 1200);

      resolve();
    }, undefined, reject);
  });

  // ── Publieke API ───────────────────────────────────────────────────────

  function getZoneSupport(zoneId) {
    const b = profile.bindings[zoneId];
    if (!b) return { supported: false, type: 'unknown', reason: 'Niet in het model-profiel.' };
    if (b.type === 'unsupported') return { supported: false, type: 'unsupported', reason: b.reason || '' };
    if (!zoneTargets[zoneId]) return { supported: false, type: b.type, reason: 'Kon niet aan het model gekoppeld worden.' };
    return { supported: true, type: b.type, reason: '' };
  }

  const isZoneSupported = (zoneId) => getZoneSupport(zoneId).supported;

  function setZoneColor(zoneId, hex) {
    const t = zoneTargets[zoneId];
    if (!t) return;
    if (t.kind === 'decal') repaintDecal(zoneId, hex);
    else targetColor[zoneId] = new THREE.Color(hex); // vloeiend via animate()
  }

  function setZoneText(zoneId, text, hex) {
    zoneText[zoneId] = text;
    if (hex !== undefined) repaintDecal(zoneId, hex);
  }

  function setZoneImage(zoneId, img, hex) {
    zoneImage[zoneId] = img;
    repaintDecal(zoneId, hex);
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

  /**
   * Rondt lopende animaties direct af en rendert één frame. Handig wanneer de
   * animatielus niet betrouwbaar tikt (achtergrondtabbladen worden door de
   * browser gethrottled) en als basis voor het maken van productafbeeldingen
   * of thumbnails van een configuratie.
   */
  function renderNow() {
    for (const zoneId in zoneTargets) {
      const t = zoneTargets[zoneId];
      if (t.kind === 'decal' || !targetColor[zoneId]) continue;
      t.materials.forEach((m) => m.color.copy(targetColor[zoneId]));
    }
    if (modelRoot) modelRoot.scale.setScalar(1);
    if (camAnim) {
      camera.position.copy(camAnim.toPos);
      controls.target.copy(camAnim.toTarget);
      camAnim = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);

    // Vloeiende kleurovergang voor mesh-/materiaalzones
    for (const zoneId in zoneTargets) {
      const t = zoneTargets[zoneId];
      if (t.kind === 'decal' || !targetColor[zoneId]) continue;
      t.materials.forEach((m) => m.color.lerp(targetColor[zoneId], Math.min(1, dt * COLOR_LERP_SPEED)));
    }

    if (modelRoot && modelRoot.scale.x < 0.999) {
      const t = Math.min(1, (performance.now() - modelRoot.userData.introStart) / 700);
      modelRoot.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, 1 - Math.pow(1 - t, 3)));
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

  // Meerdere onafhankelijke formaat-triggers: sommige omgevingen leveren geen
  // (tijdige) ResizeObserver-callback op een net ingevoegd element.
  try {
    new ResizeObserver(() => resize()).observe(canvas.parentElement);
  } catch (e) { /* window-resize vangt dit op */ }
  window.addEventListener('resize', resize);
  let pollTries = 0;
  (function pollResize() {
    if (!resize() && pollTries++ < 30) requestAnimationFrame(pollResize);
  })();

  requestAnimationFrame(animate);

  return {
    ready: readyPromise,
    profile,
    setZoneColor,
    setZoneText,
    setZoneImage,
    goToPreset,
    resize,
    renderNow,
    isZoneSupported,
    getZoneSupport,
    cameraPresetNames: Object.keys(presets),
  };
}
