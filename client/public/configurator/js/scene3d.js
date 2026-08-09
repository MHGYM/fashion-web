/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — 3D Glove Viewer (Three.js)
   ═══════════════════════════════════════════════════════════════════════════
   GENERIEKE renderer: kent géén zone- of meshnaam. Alles komt uit het actieve
   model-profiel (model-profile.js). Een ander GLB vergt alleen een nieuw
   profiel — dit bestand en de UI blijven ongewijzigd.

   Kleur en artwork lopen via één canvas-textuur per zone. Dat canvas beslaat
   de volledige UV-ruimte van de zone, dus een geüploade afbeelding bedekt
   automatisch het héle paneel (bij front-panel dus inclusief de duim). Op dat
   canvas kan de afbeelding verplaatst, geschaald en geroteerd worden.

   Publieke API (per zone-id uit zones.js):
     viewer.ready                      Promise, resolvet zodra het model staat
     viewer.setZoneColor(id, hex)      zonekleur
     viewer.setZoneArtwork(id, img, t) afbeelding + { x, y, scale, rotation }
     viewer.setZoneBadge(id, opts)     logo/tekst binnen een zone
     viewer.goToPreset(name)           camerastandpunt uit het profiel
     viewer.isZoneSupported(id)        false als het model de zone niet levert
     viewer.renderNow()                animaties afronden + één frame renderen
   ═══════════════════════════════════════════════════════════════════════════ */

import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { DecalGeometry } from './vendor/three/addons/geometries/DecalGeometry.js';
import { RoomEnvironment } from './vendor/three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from './vendor/three/addons/libs/meshopt_decoder.module.js';

import PROFILE from './model-profile.js';
import { ZONE_IDS, ZONE_BY_ID } from './zones.js';

const COLOR_LERP_SPEED = 8;
const TEX_SIZE = 1024;   // canvas per zone; groot genoeg voor scherpe uploads

export function createGloveViewer(canvas, opts = {}) {
  // Niet const: de klant kan tijdens de sessie van model wisselen.
  let profile = opts.profile || PROFILE;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = null;

  // near/far en zoomgrenzen worden afgeleid uit de modelgrootte: modellen
  // komen in sterk uiteenlopende schalen binnen.
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 10000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.75;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.88;

  // ── Studio-belichting ──────────────────────────────────────────────────
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4); key.position.set(180, 260, 200); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9db8ff, 0.9); fill.position.set(-220, 80, -160); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd9a0, 1.4); rim.position.set(-60, 180, -280); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x404040, 0.35));

  // Zachte contactschaduw
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad; sctx.fillRect(0, 0, 256, 256);
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  // ── Zone-toestand ──────────────────────────────────────────────────────
  const zones = {};        // id → { material, ctx, texture, color, artwork, badge }
  const targetColor = {};  // id → THREE.Color (vloeiende overgang)
  let modelRoot = null;
  let camRadius = 10, camTargetY = 0, camAnim = null;
  // Functie i.p.v. constante: bij een modelwissel horen de presets van het
  // nieuwe profiel te gelden.
  const presets = () => profile.cameraPresets || {};

  function fitCameraToObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    object.position.y += size.y / 2;

    // 1.85× de langste as vult het kader als een productfoto, met net genoeg
    // marge dat de manchet en de duim vrij blijven staan.
    const extent = Math.max(size.x, size.y, size.z);
    camRadius = extent * 1.85;
    camTargetY = size.y * 0.5;
    controls.target.set(0, camTargetY, 0);
    controls.minDistance = extent * 0.7;
    controls.maxDistance = extent * 3.0;
    camera.near = extent * 0.01;
    camera.far = extent * 40;
    camera.updateProjectionMatrix();

    goToPreset(Object.keys(presets())[0] || "front", 0);
    shadowMesh.scale.setScalar(Math.max(size.x, size.z) * 1.6 / 260);
    shadowMesh.position.y = -extent * 0.002;
  }

  function goToPreset(name, duration = 650) {
    const p = presets()[name] || Object.values(presets())[0];
    if (!p) return;
    const toPos = new THREE.Vector3()
      .setFromSpherical(new THREE.Spherical(camRadius, p.phi, p.theta))
      .add(controls.target);
    const toTarget = new THREE.Vector3(0, camTargetY, 0);
    if (duration <= 0) {
      camera.position.copy(toPos); controls.target.copy(toTarget); controls.update(); return;
    }
    camAnim = { fromPos: camera.position.clone(), toPos,
                fromTarget: controls.target.clone(), toTarget,
                t0: performance.now(), dur: duration };
  }

  /* ── Zone-canvas tekenen ──────────────────────────────────────────────
     Volgorde: effen zonekleur → afbeelding (UV-breed, transformeerbaar)
     → badge (logo + tekst). Zo bedekt een upload het complete paneel en
     blijft de kleur zichtbaar zolang er geen afbeelding is.               */
  function repaint(zoneId) {
    const z = zones[zoneId];
    if (!z) return;
    const { ctx } = z;
    const W = TEX_SIZE, H = TEX_SIZE;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = z.color || '#14161A';
    ctx.fillRect(0, 0, W, H);

    if (z.artwork && z.artwork.img) {
      const { img, transform: t } = z.artwork;
      // Basis: afbeelding 'cover' over het hele UV-vlak, daarna de door de
      // klant ingestelde verschuiving/schaal/rotatie eromheen.
      const base = Math.max(W / img.width, H / img.height);
      const s = base * (t.scale ?? 1);
      const w = img.width * s, h = img.height * s;
      ctx.save();
      ctx.translate(W / 2 + (t.x ?? 0) * W, H / 2 + (t.y ?? 0) * H);
      ctx.rotate(((t.rotation ?? 0) * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    z.texture.needsUpdate = true;
  }

  /* ── Badge (logo + tekst) ─────────────────────────────────────────────
     Bewust GEEN UV-plaatsing: de manchet-UV is opgeknipt in meerdere,
     deels gespiegelde eilanden, waardoor een badge op de verkeerde kant of
     ondersteboven belandt. Een decal wordt in 3D geprojecteerd op het punt
     dat de klant vóór zich ziet, dus positie en oriëntatie kloppen altijd —
     ook bij een ander model.                                              */
  function repaintBadge(zoneId) {
    const z = zones[zoneId];
    if (!z || !z.badgeCtx) return;
    const { badgeCtx: ctx, badgeCanvas: c } = z;
    const W = c.width, H = c.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // De decal beslaat de hele manchethoogte, maar daarvan is maar een deel
    // frontaal zichtbaar (de band loopt weg in de rondingen). Logo en tekst
    // blijven daarom binnen de middelste band van het canvas.
    // Logo en tekst staan NAAST elkaar op dezelfde hoogte: van de manchet is
    // maar een smalle horizontale band frontaal zichtbaar (boven verdwijnt hij
    // onder de handschoen, onder krult hij weg). Boven elkaar zetten laat het
    // bovenste element buiten beeld vallen.
    const b = z.badge || {};
    const BASE_Y = H * 0.66;              // hoogte binnen de zichtbare band
    const gap = W * 0.03;

    let logoW = 0, logoH = 0;
    if (b.img) {
      const s = Math.min(W * 0.18 / b.img.width, H * 0.20 / b.img.height);
      logoW = b.img.width * s; logoH = b.img.height * s;
    }
    let textW = 0;
    // Lettertype en -grootte komen uit de UI (fontCss met een {size}-plaatshouder,
    // fontScale als vermenigvuldiger). Zo hoeft de renderer geen fontnamen te kennen.
    const fontSize = Math.round(H * (b.img ? 0.11 : 0.15) * (b.fontScale ?? 1));
    const fontCss = (b.fontCss || '800 {size}px Inter, system-ui, sans-serif')
      .replace('{size}', fontSize);
    if (b.text) {
      ctx.font = fontCss;
      textW = Math.min(ctx.measureText(b.text.toUpperCase()).width, W * 0.5);
    }

    const totalW = logoW + (logoW && textW ? gap : 0) + textW;
    let cursor = W / 2 - totalW / 2;

    if (b.img) {
      ctx.drawImage(b.img, cursor, BASE_Y - logoH / 2, logoW, logoH);
      cursor += logoW + gap;
    }
    if (b.text) {
      ctx.fillStyle = b.textColor || '#FFFFFF';
      ctx.font = fontCss;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text.toUpperCase(), cursor, BASE_Y, W * 0.5);
    }
    z.badgeTexture.needsUpdate = true;
  }

  /** Bouwt de decal-geometrie voor een badge-zone op het naar voren gerichte
   *  oppervlak. Eén keer bij het laden; daarna wordt alleen de textuur ververst. */
  function buildBadgeDecal(zoneId, mesh, frontDir, extent) {
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const ray = new THREE.Raycaster();
    ray.set(center.clone().addScaledVector(frontDir, extent * 2), frontDir.clone().negate());
    const hit = ray.intersectObject(mesh, false)[0];
    if (!hit) { console.warn(`[3D] badge "${zoneId}": geen oppervlak gevonden.`); return null; }

    const orient = new THREE.Object3D();
    orient.position.copy(hit.point);
    orient.lookAt(hit.point.clone().add(hit.face.normal.clone().transformDirection(mesh.matrixWorld)));

    // Alleen de middelste band van de manchet is frontaal zichtbaar: de
    // bovenkant verdwijnt onder de overhangende handschoen en de onderkant
    // krult weg. De decal blijft daarom bewust laag.
    const size = box.getSize(new THREE.Vector3());
    const dim = new THREE.Vector3(
      Math.min(size.x, size.z) * 0.95,
      size.y * 0.48,
      extent * 0.5,
    );
    const geo = new DecalGeometry(mesh, hit.point, orient.rotation, dim);

    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const decal = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthTest: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.5, metalness: 0.05,
    }));
    decal.renderOrder = 10;
    scene.add(decal);
    return { badgeCanvas: c, badgeCtx: ctx, badgeTexture: tex, badgeMesh: decal };
  }

  // ── Model laden ────────────────────────────────────────────────────────
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  /** Ruimt het huidige model volledig op: GPU-geheugen van een vorig model
   *  blijft anders hangen bij elke modelwissel. */
  function disposeModel() {
    Object.values(zones).forEach((z) => {
      if (z.badgeMesh) {
        scene.remove(z.badgeMesh);
        z.badgeMesh.geometry.dispose();
        z.badgeMesh.material.map?.dispose();
        z.badgeMesh.material.dispose();
      }
    });
    Object.keys(zones).forEach((k) => delete zones[k]);
    Object.keys(targetColor).forEach((k) => delete targetColor[k]);
    if (modelRoot) {
      scene.remove(modelRoot);
      // Traverse i.p.v. alleen de zone-materialen: vangt ook statische
      // onderdelen (zoals de lining) die geen eigen zone-entry hebben.
      modelRoot.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { m?.map?.dispose(); m?.dispose(); });
      });
      modelRoot = null;
    }
  }

  /** Laadt (of vervangt) het actieve model. Geeft een Promise terug. */
  function loadModel(newProfile) {
    if (newProfile) profile = newProfile;
    disposeModel();
    return new Promise((resolve, reject) => {
    loader.load(profile.modelUrl, (gltf) => {
      modelRoot = gltf.scene;
      modelRoot.updateMatrixWorld(true);
      const meshByNode = {};
      modelRoot.traverse((o) => { if (o.isMesh) meshByNode[o.name] = o; });

      // Kijkrichting van het standaard-camerastandpunt: bepaalt welke kant
      // van het model als "voorkant" geldt bij het plaatsen van badges.
      const firstPreset = Object.values(presets())[0] || { theta: 0, phi: Math.PI / 2 };
      const frontDir = new THREE.Vector3().setFromSpherical(
        new THREE.Spherical(1, firstPreset.phi, firstPreset.theta),
      );

      const d = profile.materialDefaults || {};
      // Badges worden pas gebouwd nadat het model is ingepast (fitCameraToObject
      // verplaatst het model; decals hangen aan wereldposities).
      const pendingBadges = [];
      ZONE_IDS.forEach((zoneId) => {
        const b = profile.bindings[zoneId];
        if (!b || b.type !== 'mesh') return;
        const mesh = meshByNode[b.node];
        if (!mesh) { console.warn(`[3D] zone "${zoneId}": mesh "${b.node}" ontbreekt.`); return; }

        const c = document.createElement('canvas');
        c.width = c.height = TEX_SIZE;
        const ctx = c.getContext('2d');
        const texture = new THREE.CanvasTexture(c);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;           // glTF-UV's zijn niet geflipt
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const material = new THREE.MeshPhysicalMaterial({
          map: texture,
          color: 0xffffff,               // wit: de textuur bepaalt de kleur
          roughness: d.roughness ?? 0.45,
          metalness: d.metalness ?? 0.02,
          clearcoat: d.clearcoat ?? 0.22,
          clearcoatRoughness: d.clearcoatRoughness ?? 0.3,
          envMapIntensity: d.envMapIntensity ?? 1.0,
        });
        mesh.material = material;

        const def = ZONE_BY_ID[zoneId];
        zones[zoneId] = { material, ctx, texture, mesh, color: '#14161A', artwork: null, badge: null };
        targetColor[zoneId] = new THREE.Color('#14161A');
        repaint(zoneId);
        if (def && def.artwork === 'badge') pendingBadges.push({ zoneId, mesh });
      });

      // Statische onderdelen (voering e.d.) een eigen, dof materiaal geven
      (profile.staticNodes || []).forEach((n) => {
        const m = meshByNode[n];
        if (m) m.material = new THREE.MeshPhysicalMaterial({ color: 0x0d0e10, roughness: 0.85, metalness: 0 });
      });

      scene.add(modelRoot);
      fitCameraToObject(modelRoot);
      modelRoot.updateMatrixWorld(true);

      // Nu pas de badge-decals: de wereldposities staan definitief vast.
      const box = new THREE.Box3().setFromObject(modelRoot);
      const extent = Math.max(...box.getSize(new THREE.Vector3()).toArray());
      pendingBadges.forEach(({ zoneId, mesh }) => {
        const built = buildBadgeDecal(zoneId, mesh, frontDir, extent);
        if (built) { Object.assign(zones[zoneId], built); repaintBadge(zoneId); }
      });

      modelRoot.scale.setScalar(0.001);
      modelRoot.userData.introStart = performance.now();
      resize();
      // Veiligheidsnet: als requestAnimationFrame niet tikt (achtergrondtab)
      // blijft het model anders op schaal 0 staan.
      setTimeout(() => {
        if (modelRoot.scale.x < 0.999) { modelRoot.scale.setScalar(1); renderer.render(scene, camera); }
      }, 1200);

      resolve();
    }, undefined, reject);
    });
  }

  const readyPromise = loadModel();

  // ── Publieke API ───────────────────────────────────────────────────────
  const isZoneSupported = (id) => !!zones[id];

  function setZoneColor(zoneId, hex) {
    const z = zones[zoneId];
    if (!z) return;
    z.color = hex;
    targetColor[zoneId] = new THREE.Color(hex);
    repaint(zoneId);
  }

  /** img=null wist de afbeelding. transform: { x, y, scale, rotation } */
  function setZoneArtwork(zoneId, img, transform) {
    const z = zones[zoneId];
    if (!z) return;
    z.artwork = img ? { img, transform: transform || { x: 0, y: 0, scale: 1, rotation: 0 } } : null;
    repaint(zoneId);
  }

  function setZoneArtworkTransform(zoneId, transform) {
    const z = zones[zoneId];
    if (!z || !z.artwork) return;
    z.artwork.transform = transform;
    repaint(zoneId);
  }

  /** opts: { img, text, textColor } — losse velden mogen weggelaten worden. */
  function setZoneBadge(zoneId, opts) {
    const z = zones[zoneId];
    if (!z) return;
    z.badge = { ...(z.badge || {}), ...(opts || {}) };
    repaintBadge(zoneId);
  }

  /** Zoomt in (factor < 1) of uit (factor > 1), binnen de grenzen van OrbitControls. */
  function zoom(factor) {
    const dir = camera.position.clone().sub(controls.target);
    const dist = THREE.MathUtils.clamp(
      dir.length() * factor, controls.minDistance, controls.maxDistance,
    );
    camera.position.copy(controls.target).add(dir.setLength(dist));
    controls.update();
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

  /** Rondt animaties direct af en rendert één frame (thumbnails, tests). */
  function renderNow() {
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

    if (modelRoot && modelRoot.scale.x < 0.999) {
      const t = Math.min(1, (performance.now() - modelRoot.userData.introStart) / 700);
      modelRoot.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, 1 - Math.pow(1 - t, 3)));
    }
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

  try { new ResizeObserver(() => resize()).observe(canvas.parentElement); }
  catch (e) { /* window-resize vangt dit op */ }
  window.addEventListener('resize', resize);
  let tries = 0;
  (function poll() { if (!resize() && tries++ < 30) requestAnimationFrame(poll); })();
  requestAnimationFrame(animate);

  return {
    ready: readyPromise,
    get profile() { return profile; },   // wijzigt bij een modelwissel
    loadModel,
    setZoneColor,
    setZoneArtwork,
    setZoneArtworkTransform,
    setZoneBadge,
    goToPreset,
    zoom,
    resize,
    renderNow,
    isZoneSupported,
    get cameraPresetNames() { return Object.keys(presets()); },
  };
}
