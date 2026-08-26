/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — Scheenbeschermer Configurator (UI-laag)
   ═══════════════════════════════════════════════════════════════════════════
   Kopie/vereenvoudiging van client/public/configurator/js/configurator.js
   (bokshandschoen) — zelfde flow (zone-tabs → kleur/upload direct onder het
   3D-podium → maat/prijs/winkelwagen), maar zonder model-switcher (er is maar
   één scheenbeschermer-model, geen Velcro/Lace-Up-achtige varianten) en
   zonder manchet-naam/badge-zone (niet gevraagd voor dit product). Los
   bestand, zelfde patroon als de T-shirt-configurator, zodat wijzigingen
   hier de bokshandschoen-configurator nooit kunnen raken.
   ═══════════════════════════════════════════════════════════════════════════ */

import { createShinguardViewer } from './scene3d.js';
import profile from './models/shinguard.js';
import {
  COLORS, ZONES, SIZES, PRICING, hexOf, defaultColors, defaultArtworkTransform,
} from './zones.js';

const STORE_KEY = 'fm-shinguard-config-v1';
const API = '/api/customizer';
const PRODUCT_KEY = 'custom-shinguard';

const state = {
  colors: defaultColors(),
  artworkTransform: defaultArtworkTransform(),
  hasArtwork: false,
  // Origineel geüploade bestand — bewaard náást de Image die de 3D-preview
  // draagt, zodat het EXACTE originele bestand meegestuurd kan worden bij
  // "In winkelwagen". Nooit opgeslagen/gedeeld via localStorage (te groot,
  // overleeft een paginaherlaad toch niet) — alleen in-memory.
  artworkFile: null,
  size: '',
  activeZone: ZONES[0].id,
};

const euro = (n) => '€' + n.toFixed(2).replace('.', ',');

// Puur UI-voorkeur (in-/uitgeklapt), geen onderdeel van de configuratie.
let colorPanelOpen = true;

/* ── Opslag + deelbare link ───────────────────────────────────────────── */
const shareable = () => ({
  colors: state.colors, artworkTransform: state.artworkTransform, size: state.size,
});

function applySaved(saved) {
  if (!saved) return;
  ZONES.forEach((z) => {
    const c = saved.colors?.[z.id];
    if (typeof c === 'string' && COLORS.some((x) => x.name === c)) state.colors[z.id] = c;
  });
  if (saved.artworkTransform) Object.assign(state.artworkTransform, saved.artworkTransform);
  if (SIZES.includes(saved.size)) state.size = saved.size;
}

function load() {
  const hash = new URLSearchParams(location.hash.slice(1)).get('d');
  if (hash) {
    try { applySaved(JSON.parse(decodeURIComponent(escape(atob(hash))))); return; }
    catch (e) { /* onleesbare link negeren */ }
  }
  try { applySaved(JSON.parse(localStorage.getItem(STORE_KEY) || 'null')); }
  catch (e) { /* corrupte opslag negeren */ }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(shareable())); } catch (e) { /* private mode */ }
}
function shareUrl() {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(shareable()))));
  return `${location.origin}${location.pathname}#d=${data}`;
}

/* ── DOM ──────────────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const canvas = $('shinguard-canvas');

load();
const viewer = createShinguardViewer(canvas, { profile });

window.FMConfigurator = {
  viewer,
  getConfiguration: () => buildConfig(),
  renderNow: () => viewer.renderNow(),
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/* ── 3D bijwerken ─────────────────────────────────────────────────────── */
const FULL_ZONE = ZONES.find((z) => z.artwork === 'full');

function pushColors() {
  ZONES.forEach((z) => {
    if (viewer.isZoneSupported(z.id)) viewer.setZoneColor(z.id, hexOf(state.colors[z.id]));
  });
}

/* ── Onderdeel kiezen: compacte pillen boven het 3D-podium ───────────────
   Zelfde patroon als de bokshandschoen-configurator. */
function buildZoneTabs() {
  const wrap = $('zone-tabs');
  wrap.innerHTML = '';
  ZONES.forEach((zone) => {
    const ok = viewer.isZoneSupported(zone.id);
    const btn = el('button', 'zone-tab'
      + (zone.id === state.activeZone && ok ? ' is-active' : '')
      + (ok ? '' : ' is-unsupported'));
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', zone.id === state.activeZone && ok ? 'true' : 'false');
    if (!ok) { btn.disabled = true; btn.title = 'Niet beschikbaar op dit model.'; }

    const dot = el('span', 'zone-tab-dot');
    dot.style.background = hexOf(state.colors[zone.id]);
    if (ok && zone.id === FULL_ZONE?.id && state.hasArtwork) dot.classList.add('has-art');

    btn.append(dot, document.createTextNode(zone.label));
    if (!ok) btn.appendChild(el('span', 'zone-tab-tag', 'n.v.t.'));
    btn.addEventListener('click', () => { state.activeZone = zone.id; buildZoneTabs(); buildZoneEditor(); });
    wrap.appendChild(btn);
  });
}

function swatchGrid(selectedName, onPick, cls) {
  const grid = el('div', cls || 'swatches');
  COLORS.forEach((c) => {
    const sw = el('button', 'swatch' + (selectedName === c.name ? ' is-selected' : ''));
    sw.type = 'button';
    sw.style.background = c.hex;
    sw.title = c.name;
    sw.setAttribute('aria-label', c.name);
    sw.addEventListener('click', () => {
      grid.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-selected'));
      sw.classList.add('is-selected');
      onPick(c);
    });
    grid.appendChild(sw);
  });
  return grid;
}

function slider(label, key, min, max, step, fmt) {
  const row = el('div', 'ctrl-row');
  const head = el('div', 'ctrl-head');
  const val = el('span', 'ctrl-value', fmt(state.artworkTransform[key]));
  head.append(el('span', 'ctrl-label', label), val);
  const input = document.createElement('input');
  input.type = 'range'; input.min = min; input.max = max; input.step = step;
  input.value = state.artworkTransform[key];
  input.addEventListener('input', () => {
    state.artworkTransform[key] = parseFloat(input.value);
    val.textContent = fmt(state.artworkTransform[key]);
    if (FULL_ZONE) viewer.setZoneArtworkTransform(FULL_ZONE.id, state.artworkTransform);
    save();
  });
  row.append(head, input);
  return { row, input, val };
}

/** Uploadvak met klik én slepen-en-neerzetten — zelfde patroon (incl. de
 *  initialFileName-fix) als de bokshandschoen-configurator. */
function dropzone(titleText, subText, onFile, initialFileName) {
  const zone = el('label', 'dropzone');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.innerHTML = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>';
  const title = el('span', 'dropzone-title', titleText);
  const sub = el('span', 'dropzone-sub', subText);
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
  zone.append(icon, title, sub, input);

  if (initialFileName) {
    title.textContent = initialFileName;
    sub.textContent = 'Klik of sleep om te vervangen';
    zone.classList.add('has-file');
  }

  const handle = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { sub.textContent = 'Bestand te groot (max 5MB).'; return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      onFile(img, file);
      title.textContent = file.name;
      sub.textContent = 'Klik of sleep om te vervangen';
      zone.classList.add('has-file');
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { sub.textContent = 'Kon deze afbeelding niet lezen.'; };
    img.src = url;
  };

  input.addEventListener('change', () => handle(input.files?.[0]));
  ['dragenter', 'dragover'].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
  zone.addEventListener('drop', (e) => handle(e.dataTransfer?.files?.[0]));

  return { zone, reset: () => {
    input.value = ''; title.textContent = titleText; sub.textContent = subText;
    zone.classList.remove('has-file');
  } };
}

/* ── Kleur + upload voor de gekozen zone — direct onder het 3D-podium ──── */
function buildZoneEditor() {
  const zone = ZONES.find((z) => z.id === state.activeZone);
  const box = $('zone-editor');
  box.innerHTML = '';
  if (!zone) return;

  $('stage-title').textContent = zone.label;
  $('stage-hint').textContent = zone.hint;

  const colorHead = el('button', 'color-toggle');
  colorHead.type = 'button';
  colorHead.setAttribute('aria-expanded', String(colorPanelOpen));
  const colorDot = el('span', 'color-toggle-dot');
  colorDot.style.background = hexOf(state.colors[zone.id]);
  const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chev.setAttribute('viewBox', '0 0 24 24');
  chev.setAttribute('class', 'color-toggle-chev');
  chev.setAttribute('aria-hidden', 'true');
  chev.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
  colorHead.append(el('span', 'color-toggle-label', 'Kleur'), colorDot, chev);
  colorHead.addEventListener('click', () => {
    colorPanelOpen = !colorPanelOpen;
    colorHead.setAttribute('aria-expanded', String(colorPanelOpen));
    colorPanel.classList.toggle('is-open', colorPanelOpen);
  });
  box.appendChild(colorHead);

  const colorPanel = el('div', 'color-panel' + (colorPanelOpen ? ' is-open' : ''));
  colorPanel.appendChild(swatchGrid(state.colors[zone.id], (c) => {
    state.colors[zone.id] = c.name;
    viewer.setZoneColor(zone.id, c.hex);
    colorDot.style.background = c.hex;
    buildZoneTabs();
    save();
  }));
  box.appendChild(colorPanel);

  if (zone.artwork === 'full') {
    box.appendChild(el('div', 'divider'));
    const hFull = el('h2', 'card-title', 'Eigen logo');
    hFull.appendChild(el('span', 'price-tag', `+ ${euro(PRICING.customLogo)}`));
    box.appendChild(hFull);
    box.appendChild(el('p', 'hint', `Upload je eigen logo op de ${zone.label} — het dekt automatisch dat paneel.`));
    const dz = dropzone('Sleep je logo hierheen', 'of klik om te kiezen · PNG, JPG of SVG · max 5MB',
      (img, file) => {
        state.artworkTransform = defaultArtworkTransform();
        state.hasArtwork = true;
        state.artworkFile = file || null;
        viewer.setZoneArtwork(zone.id, img, state.artworkTransform);
        buildZoneTabs(); buildZoneEditor(); renderPrice(); save();
      },
      state.hasArtwork ? (state.artworkFile?.name || 'Logo geüpload') : null);
    box.appendChild(dz.zone);

    if (state.hasArtwork) {
      const tools = el('div', 'stack');
      tools.style.marginTop = '14px';
      const sx = slider('Horizontaal', 'x', -0.5, 0.5, 0.01, (v) => `${Math.round(v * 200)}%`);
      const sy = slider('Verticaal', 'y', -0.5, 0.5, 0.01, (v) => `${Math.round(v * 200)}%`);
      const ss = slider('Grootte', 'scale', 0.2, 3, 0.01, (v) => `${Math.round(v * 100)}%`);
      const sr = slider('Rotatie', 'rotation', -180, 180, 1, (v) => `${Math.round(v)}°`);
      const clear = el('button', 'btn btn-quiet btn-full', 'Logo verwijderen');
      clear.type = 'button';
      clear.addEventListener('click', () => {
        state.hasArtwork = false;
        state.artworkFile = null;
        viewer.setZoneArtwork(zone.id, null);
        buildZoneTabs(); buildZoneEditor(); renderPrice(); save();
      });
      tools.append(sx.row, sy.row, ss.row, sr.row, clear);
      box.appendChild(tools);
    }
  }
}

function buildSizePanel() {
  const row = $('size-row');
  SIZES.forEach((s) => {
    const b = el('button', s === state.size ? 'is-active' : '', s);
    b.type = 'button';
    b.addEventListener('click', () => {
      state.size = s;
      row.querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      $('size-hint').textContent = `Maat ${s} geselecteerd.`;
      $('add-to-cart').disabled = false;
      save();
    });
    row.appendChild(b);
  });
  $('add-to-cart').disabled = !state.size;
  if (state.size) $('size-hint').textContent = `Maat ${state.size} geselecteerd.`;
}

function renderPrice() {
  const rows = [['Scheenbeschermer', PRICING.base]];
  if (state.hasArtwork) rows.push(['Eigen logo', PRICING.customLogo]);

  const wrap = $('price-rows');
  wrap.innerHTML = '';
  rows.forEach(([label, amount]) => {
    const d = el('div');
    d.append(el('dt', null, label), el('dd', null, euro(amount)));
    wrap.appendChild(d);
  });
  $('price-total').textContent = euro(rows.reduce((s, [, a]) => s + a, 0));
}

/* ── Configuratie voor de winkelwagen ─────────────────────────────────── */
function buildConfig() {
  const zoneColors = {};
  ZONES.forEach((z) => { zoneColors[z.label] = state.colors[z.id]; });
  return {
    product: 'Custom Shin Guard',
    modelProfile: viewer.profile.id,
    size: state.size,
    colors: zoneColors,
    customImage: state.hasArtwork ? { placement: mainFrontLabel(), transform: { ...state.artworkTransform } } : null,
  };
}
function mainFrontLabel() { return (ZONES.find((z) => z.id === 'main-front') || {}).label || 'Main Front'; }

function makeDesignId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FM-SG-${stamp}-${rand}`;
}

async function uploadDesignAsset(designId, kind, zone, blob, filename) {
  const token = localStorage.getItem('sf_token');
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('zone', zone);
  fd.append('file', blob, filename);
  const res = await fetch(`${API}/design-asset/${designId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Uploaden van een productiebestand is mislukt.');
  }
  return (await res.json()).url;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = (header.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function buildProductionConfig(designId) {
  const zoneColors = {};
  ZONES.forEach((z) => { zoneColors[z.label] = state.colors[z.id]; });

  let customImage = null;
  if (state.hasArtwork) {
    customImage = { placement: mainFrontLabel(), transform: { ...state.artworkTransform } };
    if (state.artworkFile) {
      customImage.originalFilename = state.artworkFile.name;
      customImage.originalMimeType = state.artworkFile.type || null;
      customImage.originalUrl = await uploadDesignAsset(designId, 'original', 'main-front', state.artworkFile, state.artworkFile.name);
    }
    const artCanvas = viewer.getZoneArtworkCanvas(FULL_ZONE.id, 2048);
    if (artCanvas) {
      const blob = await canvasToPngBlob(artCanvas);
      if (blob) customImage.artworkUrl = await uploadDesignAsset(designId, 'artwork', 'main-front', blob, 'main-front-artwork.png');
    }
  }

  let previewUrl = null;
  {
    viewer.renderNow();
    const dataUrl = viewer.captureHighResPNG({ width: 1600, height: 1600, preset: viewer.cameraPresetNames[0] });
    const previewBlob = dataUrlToBlob(dataUrl);
    previewUrl = await uploadDesignAsset(designId, 'preview', 'general', previewBlob, 'shinguard-preview.png');
  }

  const logoSurcharge = state.hasArtwork ? PRICING.customLogo : 0;
  const displayedTotal = Math.round((PRICING.base + logoSurcharge) * 100) / 100;

  return {
    designId,
    product: 'Custom Shin Guard',
    modelProfile: viewer.profile.id,
    modelLabel: viewer.profile.label,
    size: state.size,
    colors: zoneColors,
    customImage,
    previewUrl,
    pricing: { base: PRICING.base, logoSurcharge, displayedTotal },
  };
}

/* ── Acties ───────────────────────────────────────────────────────────── */
function wireActions() {
  document.querySelectorAll('.view-bar button[data-cam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-bar button[data-cam]').forEach((b) => {
        b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true');
      viewer.goToPreset(btn.dataset.cam);
    });
  });
  $('zoom-in').addEventListener('click', () => viewer.zoom(0.82));
  $('zoom-out').addEventListener('click', () => viewer.zoom(1.22));
  $('cam-reset').addEventListener('click', () => {
    document.querySelectorAll('.view-bar button[data-cam]').forEach((b, i) => {
      b.classList.toggle('is-active', i === 0);
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    });
    viewer.goToPreset(viewer.cameraPresetNames[0]);
  });

  $('add-to-cart').addEventListener('click', async () => {
    const msg = $('cart-msg');
    const btn = $('add-to-cart');
    msg.hidden = false; msg.className = 'cart-msg';

    const token = localStorage.getItem('sf_token');
    if (!token) {
      msg.className = 'cart-msg is-err';
      msg.innerHTML = 'Log eerst in om te bestellen. <a href="/login">Naar inloggen →</a>';
      return;
    }

    msg.textContent = 'Bezig met toevoegen…';
    btn.disabled = true;
    try {
      const designId = makeDesignId();
      const config = await buildProductionConfig(designId);
      const res = await fetch(`${API}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productKey: PRODUCT_KEY, size: state.size, config }),
      });
      if (res.status === 401) {
        msg.className = 'cart-msg is-err';
        msg.innerHTML = 'Log eerst in om te bestellen. <a href="/login">Naar inloggen →</a>';
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        msg.className = 'cart-msg is-err';
        msg.textContent = data.error || 'Toevoegen mislukt. Probeer het opnieuw.';
      } else {
        msg.className = 'cart-msg is-ok';
        msg.innerHTML = 'Toegevoegd aan je winkelwagen. <a href="/cart">Bekijk winkelwagen →</a>';
      }
    } catch (e) {
      msg.className = 'cart-msg is-err';
      msg.textContent = e?.message || 'Geen verbinding met de server.';
    }
    btn.disabled = !state.size;
  });

  $('save-design').addEventListener('click', () => {
    viewer.renderNow();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'fightmarketing-scheenbeschermer-ontwerp.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  });

  $('reset').addEventListener('click', () => {
    state.colors = defaultColors();
    state.artworkTransform = defaultArtworkTransform();
    state.hasArtwork = false;
    state.artworkFile = null;
    state.size = '';
    if (FULL_ZONE) viewer.setZoneArtwork(FULL_ZONE.id, null);
    history.replaceState(null, '', location.pathname);
    localStorage.removeItem(STORE_KEY);
    location.reload();
  });

  const setShareTargets = () => {
    const url = shareUrl();
    $('share-whatsapp').href = `https://wa.me/?text=${encodeURIComponent('Bekijk mijn FightMarketing-ontwerp: ' + url)}`;
    $('share-mail').href = `mailto:?subject=${encodeURIComponent('Mijn FightMarketing-ontwerp')}&body=${encodeURIComponent(url)}`;
  };
  $('share-copy').addEventListener('click', async () => {
    setShareTargets();
    try {
      await navigator.clipboard.writeText(shareUrl());
      const msg = $('cart-msg');
      msg.hidden = false; msg.className = 'cart-msg is-ok';
      msg.textContent = 'Link naar je ontwerp gekopieerd.';
    } catch (e) { /* clipboard geweigerd */ }
  });
  ['share-whatsapp', 'share-mail'].forEach((id) => $(id).addEventListener('mouseenter', setShareTargets));
  setShareTargets();
}

function showAttribution() {
  const a = viewer.profile.attribution;
  $('attribution').innerHTML = a
    ? `3D-model “${a.title}” van <a href="${a.authorUrl}" target="_blank" rel="noopener">${a.author}</a>, ` +
      `gebruikt onder <a href="${a.licenseUrl}" target="_blank" rel="noopener">${a.license}</a>.`
    : '';
}

/* ── Start ────────────────────────────────────────────────────────────── */
viewer.ready.then(async () => {
  $('stage-loading').classList.add('is-hidden');
  buildZoneTabs();
  buildZoneEditor();
  buildSizePanel();
  renderPrice();
  wireActions();
  showAttribution();
  pushColors();
}).catch((err) => {
  console.error('[3D] laden mislukt:', err);
  $('stage-loading').classList.add('is-hidden');
  $('stage-error').hidden = false;
  $('stage-error').textContent =
    'Het 3D-model kon niet geladen worden. Open deze pagina via een webserver — ' +
    'direct openen vanaf je schijf blokkeert het laden van de GLB en de modules.';
});
