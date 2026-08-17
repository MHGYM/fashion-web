/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — T-shirt Configurator (UI-laag)
   ═══════════════════════════════════════════════════════════════════════════
   Zelfde patroon als client/public/configurator/js/configurator.js (bok-
   shandschoen): state-object, canvas-per-onderdeel in de 3D-laag, dezelfde
   upload/prijs/winkelwagen-flow tegen dezelfde /api/customizer-endpoints.

   Vereenvoudigd t.o.v. de handschoen omdat het shirt maar één kleurbare
   "zone" heeft (het hele shirt, zie zones.js) i.p.v. 9 losse onderdelen:
   geen model-lijst, geen zone-tabs. Eigen logo/ontwerp en naam zijn elk
   onafhankelijk naar de voor- of achterkant te plaatsen en met de muis/touch
   te verslepen op het canvas (zie scene3d.js, sectie "SLEPEN").
   ═══════════════════════════════════════════════════════════════════════════ */

import { createShirtViewer } from './scene3d.js';
import {
  COLORS, SIZES, PRICING, NAME_FONTS, NAME_SIZES, hexOf, defaultArtworkTransform, defaultNameTransform,
} from './zones.js';

const STORE_KEY = 'fm-shirt-config-v1';
const API = '/api/customizer';
const PRODUCT_KEY = 'custom-jersey';
const PLACEMENT_LABEL = { front: 'Voorkant', back: 'Achterkant' };

const state = {
  color: 'Black',
  artworkTransform: defaultArtworkTransform(),
  artworkPlacement: 'front',
  hasArtwork: false,
  artworkFile: null,
  name: '',
  nameFont: NAME_FONTS[0].id,
  nameSize: 'm',
  nameColor: 'White',
  nameTransform: defaultNameTransform(),
  namePlacement: 'front',
  size: '',
};

const euro = (n) => '€' + n.toFixed(2).replace('.', ',');

const shareable = () => ({
  color: state.color, artworkTransform: state.artworkTransform, artworkPlacement: state.artworkPlacement,
  name: state.name, nameFont: state.nameFont, nameSize: state.nameSize,
  nameColor: state.nameColor, nameTransform: state.nameTransform, namePlacement: state.namePlacement,
  size: state.size,
});

function applySaved(saved) {
  if (!saved) return;
  if (COLORS.some((c) => c.name === saved.color)) state.color = saved.color;
  if (saved.artworkTransform) Object.assign(state.artworkTransform, saved.artworkTransform);
  if (saved.artworkPlacement === 'front' || saved.artworkPlacement === 'back') state.artworkPlacement = saved.artworkPlacement;
  if (typeof saved.name === 'string') state.name = saved.name.slice(0, 20);
  if (NAME_FONTS.some((f) => f.id === saved.nameFont)) state.nameFont = saved.nameFont;
  if (NAME_SIZES.some((s) => s.id === saved.nameSize)) state.nameSize = saved.nameSize;
  if (COLORS.some((c) => c.name === saved.nameColor)) state.nameColor = saved.nameColor;
  if (saved.nameTransform) Object.assign(state.nameTransform, saved.nameTransform);
  if (saved.namePlacement === 'front' || saved.namePlacement === 'back') state.namePlacement = saved.namePlacement;
  if (SIZES.includes(saved.size)) state.size = saved.size;
}
function load() {
  try { applySaved(JSON.parse(localStorage.getItem(STORE_KEY) || 'null')); } catch (e) { /* corrupte opslag negeren */ }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(shareable())); } catch (e) { /* private mode */ }
}

const $ = (id) => document.getElementById(id);
const canvas = $('shirt-canvas');

load();
// onArtworkDrag/onNameDrag: houdt de state (en dus de sliders/opslag) in sync
// terwijl de klant het logo of de naam met de muis/touch over het shirt sleept.
const viewer = createShirtViewer(canvas, {
  onArtworkDrag: (t) => {
    state.artworkTransform = t;
    syncArtworkPositionUI();
    save();
  },
  onNameDrag: (t) => {
    state.nameTransform = t;
    save();
  },
});

window.FMShirtConfigurator = { viewer, getConfiguration: () => buildConfig(), renderNow: () => viewer.renderNow() };

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function pushName() {
  const font = NAME_FONTS.find((f) => f.id === state.nameFont) || NAME_FONTS[0];
  const size = NAME_SIZES.find((s) => s.id === state.nameSize) || NAME_SIZES[2];
  viewer.setName(state.name.trim() ? {
    text: state.name.trim(), color: hexOf(state.nameColor), fontCss: font.css, fontScale: size.scale,
  } : null, state.namePlacement, state.nameTransform);
}

/** Bouwt een "Voorkant/Achterkant"-keuze zoals de bestaande maat-chips
 *  (#size-row), zodat logo en naam elk apart naar de voor- of achterkant
 *  van het shirt verplaatst kunnen worden. */
function placementToggle(selected, onPick) {
  const row = el('div', 'chip-row');
  ['front', 'back'].forEach((p) => {
    const b = el('button', p === selected ? 'is-active' : '', PLACEMENT_LABEL[p]);
    b.type = 'button';
    b.addEventListener('click', () => {
      row.querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      onPick(p);
    });
    row.appendChild(b);
  });
  return row;
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
    viewer.setArtworkTransform(state.artworkTransform);
    save();
  });
  row.append(head, input);
  return { row, input, val };
}

function dropzone(titleText, subText, onFile) {
  const zone = el('label', 'dropzone');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.innerHTML = '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>';
  const title = el('span', 'dropzone-title', titleText);
  const sub = el('span', 'dropzone-sub', subText);
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
  zone.append(icon, title, sub, input);

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
  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
  zone.addEventListener('drop', (e) => handle(e.dataTransfer?.files?.[0]));

  return { zone };
}

/* ── Kleurpaneel: ÉÉN kleur voor het HELE shirt (front+back+mouwen) ─────── */
// Zelfde in-/uitklappatroon (.color-toggle/.color-panel) als de bestaande
// bokshandschoen-configurator (client/public/configurator/js/configurator.js)
// — puur UI-state, niet opgeslagen en niet van invloed op state.color/
// artwork/name: in-/uitklappen verandert dus nooit de gekozen kleur, het
// logo, de naam of hun positie.
let colorPanelOpen = true;

function buildColorPanel() {
  const box = $('color-card');
  box.innerHTML = '';

  const colorHead = el('button', 'color-toggle');
  colorHead.type = 'button';
  colorHead.setAttribute('aria-expanded', String(colorPanelOpen));
  colorHead.setAttribute('aria-controls', 'color-panel');
  const colorDot = el('span', 'color-toggle-dot');
  colorDot.style.background = hexOf(state.color);
  const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chev.setAttribute('viewBox', '0 0 24 24');
  chev.setAttribute('class', 'color-toggle-chev');
  chev.setAttribute('aria-hidden', 'true');
  chev.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
  colorHead.append(el('span', 'color-toggle-label', 'Shirtkleur'), colorDot, chev);
  colorHead.addEventListener('click', () => {
    colorPanelOpen = !colorPanelOpen;
    colorHead.setAttribute('aria-expanded', String(colorPanelOpen));
    colorPanel.classList.toggle('is-open', colorPanelOpen);
  });
  box.appendChild(colorHead);

  const colorPanel = el('div', 'color-panel' + (colorPanelOpen ? ' is-open' : ''));
  colorPanel.id = 'color-panel';
  colorPanel.appendChild(swatchGrid(state.color, (c) => {
    state.color = c.name;
    viewer.setShirtColor(c.hex);
    colorDot.style.background = c.hex;
    save();
  }));
  box.appendChild(colorPanel);
}

/* ── Eigen logo/ontwerp op de voor- of achterkant ────────────────────────── */
let artworkPositionSliders = null; // {x,y}-sliderrefs, live bijgewerkt tijdens slepen op het canvas

function syncArtworkPositionUI() {
  if (!artworkPositionSliders) return;
  const t = state.artworkTransform;
  artworkPositionSliders.x.input.value = t.x;
  artworkPositionSliders.x.val.textContent = `${Math.round(t.x * 200)}%`;
  artworkPositionSliders.y.input.value = t.y;
  artworkPositionSliders.y.val.textContent = `${Math.round(t.y * 200)}%`;
}

function buildArtworkPanel() {
  const box = $('artwork-panel');
  box.innerHTML = '';
  artworkPositionSliders = null;

  const h = el('h2', 'card-title', 'Eigen logo / ontwerp');
  h.appendChild(el('span', 'price-tag', `+ ${euro(PRICING.customLogo)}`));
  box.appendChild(h);
  box.appendChild(el('p', 'hint', 'Upload je eigen logo of ontwerp en sleep het naar de gewenste plek op het shirt.'));

  box.appendChild(el('span', 'field-label', 'Plaatsing'));
  box.appendChild(placementToggle(state.artworkPlacement, (p) => {
    state.artworkPlacement = p;
    if (state.hasArtwork) viewer.setArtworkPlacement(p);
    save();
  }));

  const dz = dropzone('Sleep je logo hierheen', 'of klik om te kiezen · PNG, JPG of SVG · max 5MB', (img, file) => {
    state.artworkTransform = defaultArtworkTransform();
    state.hasArtwork = true;
    state.artworkFile = file || null;
    viewer.setArtwork(img, state.artworkTransform, state.artworkPlacement);
    buildArtworkPanel(); renderPrice(); save();
  });
  box.appendChild(dz.zone);

  if (state.hasArtwork) {
    const tools = el('div', 'stack');
    tools.style.marginTop = '14px';
    const sx = slider('Horizontaal', 'x', -0.5, 0.5, 0.01, (v) => `${Math.round(v * 200)}%`);
    const sy = slider('Verticaal', 'y', -0.5, 0.5, 0.01, (v) => `${Math.round(v * 200)}%`);
    const ss = slider('Grootte', 'scale', 0.2, 3, 0.01, (v) => `${Math.round(v * 100)}%`);
    const sr = slider('Rotatie', 'rotation', -180, 180, 1, (v) => `${Math.round(v)}°`);
    artworkPositionSliders = { x: sx, y: sy };
    const clear = el('button', 'btn btn-quiet btn-full', 'Logo verwijderen');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      state.hasArtwork = false;
      state.artworkFile = null;
      viewer.setArtwork(null);
      buildArtworkPanel(); renderPrice(); save();
    });
    tools.append(sx.row, sy.row, ss.row, sr.row, clear);
    box.appendChild(tools);
  }
}

/* ── Naam op de voor- of achterkant ──────────────────────────────────────── */
function buildNamePanel() {
  const placementBox = $('name-placement');
  placementBox.innerHTML = '';
  placementBox.appendChild(placementToggle(state.namePlacement, (p) => {
    state.namePlacement = p;
    if (state.name.trim()) viewer.setNamePlacement(p);
    save();
  }));

  const input = $('name-input');
  input.value = state.name;
  input.addEventListener('input', () => {
    state.name = input.value.slice(0, 20);
    pushName(); renderPrice(); save();
  });

  const fontSel = $('name-font');
  NAME_FONTS.forEach((f) => {
    const o = document.createElement('option');
    o.value = f.id; o.textContent = f.label;
    fontSel.appendChild(o);
  });
  fontSel.value = state.nameFont;
  fontSel.addEventListener('change', () => { state.nameFont = fontSel.value; pushName(); save(); });

  const sizeWrap = $('name-size');
  NAME_SIZES.forEach((s) => {
    const b = el('button', s.id === state.nameSize ? 'is-active' : '', s.label);
    b.type = 'button';
    b.setAttribute('aria-label', `Tekstgrootte ${s.id}`);
    b.addEventListener('click', () => {
      state.nameSize = s.id;
      sizeWrap.querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      pushName(); save();
    });
    sizeWrap.appendChild(b);
  });

  $('name-color').appendChild(
    swatchGrid(state.nameColor, (c) => { state.nameColor = c.name; pushName(); save(); }, 'mini-swatches'),
  );
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
  const rows = [['Shirt', PRICING.base]];
  if (state.hasArtwork) rows.push(['Eigen logo/ontwerp', PRICING.customLogo]);
  if (state.name.trim()) rows.push(['Naam', PRICING.name]);
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
  return {
    product: 'Custom Fight Jersey',
    size: state.size,
    color: state.color,
    customImage: state.hasArtwork
      ? { placement: PLACEMENT_LABEL[state.artworkPlacement], transform: { ...state.artworkTransform } }
      : null,
    name: state.name.trim() ? {
      text: state.name.trim(), color: state.nameColor,
      font: (NAME_FONTS.find((f) => f.id === state.nameFont) || {}).label, size: state.nameSize,
      placement: PLACEMENT_LABEL[state.namePlacement], transform: { ...state.nameTransform },
    } : null,
  };
}

function makeDesignId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FM-SHIRT-${stamp}-${rand}`;
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
  let customImage = null;
  if (state.hasArtwork) {
    const zone = state.artworkPlacement;
    customImage = { placement: PLACEMENT_LABEL[zone], transform: { ...state.artworkTransform } };
    if (state.artworkFile) {
      customImage.originalFilename = state.artworkFile.name;
      customImage.originalMimeType = state.artworkFile.type || null;
      customImage.originalUrl = await uploadDesignAsset(designId, 'original', zone, state.artworkFile, state.artworkFile.name);
    }
    const artCanvas = viewer.getArtworkCanvas(zone, 2048);
    if (artCanvas) {
      const blob = await canvasToPngBlob(artCanvas);
      if (blob) customImage.artworkUrl = await uploadDesignAsset(designId, 'artwork', zone, blob, `${zone}-artwork.png`);
    }
  }

  const nameObj = state.name.trim() ? {
    text: state.name.trim(), color: state.nameColor,
    font: (NAME_FONTS.find((f) => f.id === state.nameFont) || {}).label, size: state.nameSize,
    placement: PLACEMENT_LABEL[state.namePlacement], transform: { ...state.nameTransform },
  } : null;

  let shirtPreviewUrl = null;
  {
    viewer.renderNow();
    const dataUrl = viewer.captureHighResPNG({ width: 1600, height: 1600, preset: 'front' });
    const previewBlob = dataUrlToBlob(dataUrl);
    shirtPreviewUrl = await uploadDesignAsset(designId, 'preview', 'general', previewBlob, 'shirt-preview.png');
  }

  const logoSurcharge = state.hasArtwork ? PRICING.customLogo : 0;
  const nameSurcharge = nameObj ? PRICING.name : 0;
  const displayedTotal = Math.round((PRICING.base + logoSurcharge + nameSurcharge) * 100) / 100;

  return {
    designId,
    product: 'Custom Fight Jersey',
    size: state.size,
    color: state.color,
    customImage,
    name: nameObj,
    shirtPreviewUrl,
    pricing: { base: PRICING.base, logoSurcharge, nameSurcharge, displayedTotal },
  };
}

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
    viewer.goToPreset('front');
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
      a.download = 'fightmarketing-shirt-ontwerp.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  });

  $('reset').addEventListener('click', () => {
    state.color = 'Black';
    state.artworkTransform = defaultArtworkTransform();
    state.artworkPlacement = 'front';
    state.hasArtwork = false; state.artworkFile = null;
    state.name = ''; state.size = '';
    state.nameFont = NAME_FONTS[0].id; state.nameSize = 'm'; state.nameColor = 'White';
    state.nameTransform = defaultNameTransform(); state.namePlacement = 'front';
    viewer.setArtwork(null);
    viewer.setName(null);
    localStorage.removeItem(STORE_KEY);
    location.reload();
  });
}

viewer.ready.then(async () => {
  $('stage-loading').classList.add('is-hidden');
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch (e) { /* niet kritiek */ } }
  buildColorPanel();
  buildArtworkPanel();
  buildNamePanel();
  buildSizePanel();
  renderPrice();
  wireActions();
  viewer.setShirtColor(hexOf(state.color));
  pushName();
  if (state.hasArtwork) buildArtworkPanel();
}).catch((err) => {
  console.error('[3D] laden mislukt:', err);
  $('stage-loading').classList.add('is-hidden');
  $('stage-error').hidden = false;
  $('stage-error').textContent =
    'Het 3D-model kon niet geladen worden. Open deze pagina via een webserver — ' +
    'direct openen vanaf je schijf blokkeert het laden van de GLB en de modules.';
});
