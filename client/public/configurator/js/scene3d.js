/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — 3D Glove Viewer (Three.js)
   ═══════════════════════════════════════════════════════════════════════════
   GENERIEKE renderer: kent géén zone- of meshnaam. Alles komt uit het actieve
   model-profiel (model-profile.js). Een ander GLB vergt alleen een nieuw
   profiel — dit bestand en de UI blijven ongewijzigd.

   Kleur loopt via één canvas-textuur per zone (dekt de eigen UV-ruimte van
   die zone). De 'volledige afbeelding'-upload (front-panel) is een APARTE
   laag: een in 3D geprojecteerde decal die over meerdere meshes tegelijk ligt
   (front-panel + duim), zodat één upload als één ononderbroken ontwerp over
   het hele paneel én de duim verschijnt — ook al zijn dat losse meshes met
   elk hun eigen UV. Zonder afbeelding blijven die meshes gewoon hun eigen,
   los instelbare kleur tonen. Verplaatsen/schalen/roteren werkt hetzelfde
   voor beide lagen (drawCoverImage), alleen het canvas erachter verschilt.

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

/** Verduistert (amt<0) of verlicht (amt>0) een hex-kleur met amt ∈ [-1,1].
 *  Gebruikt om een donkerdere tint van dezelfde kleur te krijgen voor het
 *  borduur-effect, zonder een aparte kleur te hoeven kiezen. */
function shadeColor(hex, amt) {
  const c = (hex || '#FFFFFF').replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const num = parseInt(full, 16) || 0xffffff;
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? -v : 255 - v) * Math.abs(amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Welke zone de 'volledige afbeelding'-upload draagt — bepaald uit de data
// (zones.js), niet hardcoded op een zone-id, zodat dit generiek blijft.
const FULL_ZONE_ID = ZONE_IDS.find((id) => ZONE_BY_ID[id].artwork === 'full') || null;

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
  const zones = {};        // id → { material, ctx, texture, mesh, color, badge }
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

  /** Tekent `img` 'cover'-gevuld over een canvas van W×H, met de door de klant
   *  ingestelde verschuiving/schaal/rotatie eromheen. Gedeeld door de
   *  per-zone kleurcanvassen en de front-artwork-decal, zodat "verplaatsen/
   *  schalen/roteren" overal exact hetzelfde gedrag heeft. */
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

  /* ── Zone-canvas tekenen (effen kleur) ─────────────────────────────────
     Alleen de zonekleur. Een geüploade afbeelding voor de 'full'-artwork-
     zone loopt over MEERDERE meshes heen (zie repaintFrontArtwork) en kan
     dus niet in dit per-zone-canvas getekend worden — die meshes blijven
     hun eigen kleur tonen tot de decal (die erbovenop ligt) zichtbaar wordt. */
  function repaint(zoneId) {
    const z = zones[zoneId];
    if (!z) return;
    const { ctx } = z;
    const W = TEX_SIZE, H = TEX_SIZE;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = z.color || '#14161A';
    ctx.fillRect(0, 0, W, H);
    z.texture.needsUpdate = true;
  }

  /* ── Badge (logo + tekst) ─────────────────────────────────────────────
     Bewust GEEN UV-plaatsing: de manchet-UV is opgeknipt in meerdere,
     deels gespiegelde eilanden, waardoor een badge op de verkeerde kant of
     ondersteboven belandt. Een decal wordt in 3D geprojecteerd op het punt
     dat de klant vóór zich ziet, dus positie en oriëntatie kloppen altijd —
     ook bij een ander model.                                              */
  /** Zuivere tekenfunctie (canvas-afmeting/badge-data als parameter) zodat
   *  dezelfde opmaak ook op een aparte, grotere canvas gebruikt kan worden
   *  voor een hoge-resolutie productie-export — zonder de live badge-canvas
   *  (512×512, zie repaintBadge) aan te raken. Alle maten zijn relatief aan
   *  W/H, dus dit schaalt naar elke canvasgrootte. */
  function paintBadge(ctx, W, H, b) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // De decal beslaat de hele manchethoogte, maar daarvan is maar een deel
    // frontaal zichtbaar (de band loopt weg in de rondingen). Logo en tekst
    // blijven daarom binnen de middelste band van het canvas.
    // Logo en tekst staan NAAST elkaar op dezelfde hoogte: van de manchet is
    // maar een smalle horizontale band frontaal zichtbaar (boven verdwijnt hij
    // onder de handschoen, onder krult hij weg). Boven elkaar zetten laat het
    // bovenste element buiten beeld vallen.
    b = b || {};
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
      // Borduureffect i.p.v. platte print: een donker, licht verschoven
      // schaduwlaagje geeft de tekst diepte (het reliëf van draad op stof),
      // en een dunne omtreklijn in een donkerdere tint van dezelfde kleur
      // simuleert de dichte steekrand van satijnsteek-borduurwerk.
      const label = b.text.toUpperCase();
      const base = b.textColor || '#FFFFFF';
      ctx.font = fontCss;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const maxW = W * 0.5;

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillText(label, cursor + fontSize * 0.035, BASE_Y + fontSize * 0.05, maxW);

      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, fontSize * 0.05);
      ctx.strokeStyle = shadeColor(base, -0.45);
      ctx.strokeText(label, cursor, BASE_Y, maxW);

      ctx.fillStyle = base;
      ctx.fillText(label, cursor, BASE_Y, maxW);
    }
  }

  function repaintBadge(zoneId) {
    const z = zones[zoneId];
    if (!z || !z.badgeCtx) return;
    paintBadge(z.badgeCtx, z.badgeCanvas.width, z.badgeCanvas.height, z.badge);
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

    // Zelfde matte richting als de andere materialen, zodat de manchet niet
    // opvallend glanziger oogt dan de rest van de handschoen.
    const decal = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthTest: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.75, metalness: 0,
    }));
    decal.renderOrder = 10;
    scene.add(decal);
    return { badgeCanvas: c, badgeCtx: ctx, badgeTexture: tex, badgeMesh: decal };
  }

  /* ── Front-artwork: één doorlopende afbeelding over meerdere meshes ─────
     Front Panel en de duim zijn TWEE (of meer) losse meshes met elk hun
     eigen UV-ruimte — een per-zone canvas zou de afbeelding dus alleen op
     één van de twee laten zien, met de duim in zijn eigen effen kleur
     ernaast (precies het manco dat dit systeem oplost). Net als bij de
     badge wordt daarom een decal geprojecteerd, maar nu met DEZELFDE
     doos (positie/oriëntatie/afmeting) gedeeld over alle meshes uit
     artworkGroup — zo valt de afbeelding op elk van die meshes precies op
     zijn plek, als één ononderbroken ontwerp, ongeacht hun eigen UV's.     */
  let frontArtwork = null;   // { state:{img,transform}, canvas, ctx, texture, decalMeshes[] }

  function disposeFrontArtwork() {
    if (!frontArtwork) return;
    frontArtwork.decalMeshes.forEach((m) => { scene.remove(m); m.geometry.dispose(); });
    frontArtwork.material.dispose();
    frontArtwork.texture.dispose();
    frontArtwork = null;
  }

  function buildFrontArtworkDecal(meshes, frontDir, materialDefaults) {
    if (!meshes.length) return null;

    // Vlakke projectie loodrecht op de kijkrichting: 'right' en 'up' t.o.v.
    // de camera, niet t.o.v. het model — zo blijft een geüploade afbeelding
    // rechtop staan ongeacht hoe het model zelf georiënteerd is.
    const worldUp = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3().crossVectors(worldUp, frontDir).normalize();
    if (right.lengthSq() < 1e-6) right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(frontDir, right).normalize();

    const box = new THREE.Box3();
    meshes.forEach((m) => box.union(new THREE.Box3().setFromObject(m)));
    const center = box.getCenter(new THREE.Vector3());
    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z), new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z), new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z), new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z), new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];
    let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity, minF = Infinity, maxF = -Infinity;
    corners.forEach((c) => {
      const rel = c.sub(center);
      minR = Math.min(minR, rel.dot(right)); maxR = Math.max(maxR, rel.dot(right));
      minU = Math.min(minU, rel.dot(up)); maxU = Math.max(maxU, rel.dot(up));
      minF = Math.min(minF, rel.dot(frontDir)); maxF = Math.max(maxF, rel.dot(frontDir));
    });
    // Ruime marge: de duim mag niet net buiten de doos vallen, en genoeg
    // diepte dat de hele dikte van het paneel wordt meegenomen.
    const width = (maxR - minR) * 1.15;
    const height = (maxU - minU) * 1.15;
    const depth = Math.max(maxF - minF, width, height) * 1.5;
    const size = new THREE.Vector3(width, height, depth);

    const orient = new THREE.Object3D();
    orient.position.copy(center);
    orient.lookAt(center.clone().add(frontDir));

    const c = document.createElement('canvas');
    c.width = c.height = TEX_SIZE;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const d = materialDefaults || {};
    // Zelfde matte instellingen als de zone-materialen (zie hierboven) — dit
    // is letterlijk het materiaal dat een geüpload logo draagt, dus juist
    // hier is een scherpe glans-highlight het meest schadelijk voor de
    // leesbaarheid.
    const material = new THREE.MeshPhysicalMaterial({
      map: tex, transparent: false, depthTest: true, depthWrite: true,
      polygonOffset: true, polygonOffsetFactor: -2,
      roughness: d.roughness ?? 0.78, metalness: d.metalness ?? 0.0,
      clearcoat: d.clearcoat ?? 0, clearcoatRoughness: d.clearcoatRoughness ?? 1,
      envMapIntensity: d.envMapIntensity ?? 0.4,
    });

    const decalMeshes = meshes.map((mesh) => {
      const geo = new DecalGeometry(mesh, center, orient.rotation, size);
      const dm = new THREE.Mesh(geo, material);
      dm.renderOrder = 6;
      dm.visible = false;
      scene.add(dm);
      return dm;
    });

    return { state: null, canvas: c, ctx, texture: tex, material, decalMeshes };
  }

  function repaintFrontArtwork() {
    if (!frontArtwork) return;
    const { ctx, canvas: c } = frontArtwork;
    const st = frontArtwork.state;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    if (st && st.img) drawCoverImage(ctx, c.width, c.height, st.img, st.transform);
    frontArtwork.texture.needsUpdate = true;
    frontArtwork.decalMeshes.forEach((m) => { m.visible = !!(st && st.img); });
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
    disposeFrontArtwork();
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
          // Matte fallback (zie models/*.js voor de toelichting) — geldt
          // alleen als een toekomstig model-profiel geen materialDefaults zet.
          roughness: d.roughness ?? 0.78,
          metalness: d.metalness ?? 0.0,
          clearcoat: d.clearcoat ?? 0,
          clearcoatRoughness: d.clearcoatRoughness ?? 1,
          envMapIntensity: d.envMapIntensity ?? 0.4,
        });
        mesh.material = material;

        const def = ZONE_BY_ID[zoneId];
        zones[zoneId] = { material, ctx, texture, mesh, color: '#14161A', badge: null };
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

      // Front-artwork-decal: welke meshes daadwerkelijk meedoen hangt af van
      // wat dít model levert (isZoneSupported per lid van artworkGroup) —
      // ontbreekt de duim op een toekomstig model, dan valt dit vanzelf
      // terug op alleen de 'full'-zone zelf.
      if (FULL_ZONE_ID) {
        const groupIds = ZONE_BY_ID[FULL_ZONE_ID].artworkGroup || [FULL_ZONE_ID];
        const artworkMeshes = groupIds.map((id) => zones[id]?.mesh).filter(Boolean);
        frontArtwork = buildFrontArtworkDecal(artworkMeshes, frontDir, profile.materialDefaults);
      }

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

  /** img=null wist de afbeelding. transform: { x, y, scale, rotation }
   *  Loopt voor de 'full'-zone via de front-artwork-decal (zie boven) — die
   *  ene afbeelding dekt daar meerdere meshes tegelijk, ononderbroken. */
  function setZoneArtwork(zoneId, img, transform) {
    if (zoneId !== FULL_ZONE_ID || !frontArtwork) return;
    frontArtwork.state = img ? { img, transform: transform || { x: 0, y: 0, scale: 1, rotation: 0 } } : null;
    repaintFrontArtwork();
  }

  function setZoneArtworkTransform(zoneId, transform) {
    if (zoneId !== FULL_ZONE_ID || !frontArtwork?.state) return;
    frontArtwork.state.transform = transform;
    repaintFrontArtwork();
  }

  /** opts: { img, text, textColor } — losse velden mogen weggelaten worden. */
  function setZoneBadge(zoneId, opts) {
    const z = zones[zoneId];
    if (!z) return;
    z.badge = { ...(z.badge || {}), ...(opts || {}) };
    repaintBadge(zoneId);
  }

  /** Rendert het huidige artwork van een zone op een NIEUWE, losstaande canvas
   *  op `size`×`size` — voor productie-export, dus onafhankelijk van TEX_SIZE
   *  (de kleinere, prestatiegerichte canvas die de live 3D-textuur draagt).
   *  Retourneert null als de zone geen (ondersteunde) artwork-laag heeft of
   *  leeg is. Raakt de live 3D-scene niet aan. */
  function getZoneArtworkCanvas(zoneId, size = 2048) {
    if (zoneId === FULL_ZONE_ID) {
      if (!frontArtwork?.state?.img) return null;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      drawCoverImage(c.getContext('2d'), size, size, frontArtwork.state.img, frontArtwork.state.transform);
      return c;
    }
    const z = zones[zoneId];
    if (z?.badge && (z.badge.img || z.badge.text)) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      paintBadge(c.getContext('2d'), size, size, z.badge);
      return c;
    }
    return null;
  }

  /** Rendert één frame op `width`×`height` en geeft een PNG data-URL terug,
   *  voor een scherpe glove-preview t.b.v. productie-export. Herstelt de
   *  live viewport meteen na het lezen van de pixels — er wordt tussentijds
   *  niet geyield naar het scherm, dus de klant ziet geen flits/sprong. */
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
    getZoneArtworkCanvas,
    captureHighResPNG,
    goToPreset,
    zoom,
    resize,
    renderNow,
    isZoneSupported,
    get cameraPresetNames() { return Object.keys(presets()); },
  };
}
