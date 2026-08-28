/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — T-shirt Configurator (UI-laag)
   ═══════════════════════════════════════════════════════════════════════════
   Zelfde patroon als client/public/configurator/js/configurator.js (bok-
   shandschoen): state-object, canvas-per-onderdeel in de 3D-laag, dezelfde
   upload/prijs/winkelwagen-flow tegen dezelfde /api/customizer-endpoints.

   Vereenvoudigd t.o.v. de handschoen omdat het shirt maar één kleurbare
   "zone" heeft (het hele shirt, zie zones.js) i.p.v. 9 losse onderdelen:
   geen model-lijst, geen zone-tabs. Eigen logo/ontwerp en naam zijn elk
   TWEE onafhankelijke instanties — één voor de voorkant, één voor de
   achterkant — die tegelijk actief kunnen zijn en elk apart met de muis/
   touch te verslepen zijn op het canvas (zie scene3d.js, sectie "SLEPEN").
   ═══════════════════════════════════════════════════════════════════════════ */

import { createShirtViewer } from './scene3d.js';
import {
  COLORS, SIZES, PRICING, NAME_FONTS, NAME_SIZES, hexOf, defaultArtworkTransform, defaultNameTransform,
} from './zones.js';

const STORE_KEY = 'fm-shirt-config-v2';
const API = '/api/customizer';
const PRODUCT_KEY = 'custom-jersey';
const SIDES = ['front', 'back'];
const SIDE_LABEL = { front: 'Voorkant', back: 'Achterkant' };

function freshLogoSide() {
  return { hasArtwork: false, artworkFile: null, transform: defaultArtworkTransform() };
}
function freshNameSide() {
  return { text: '', font: NAME_FONTS[0].id, size: 'm', color: 'White', transform: defaultNameTransform() };
}

const state = {
  color: 'Black',
  logo: { front: freshLogoSide(), back: freshLogoSide() },
  name: { front: freshNameSide(), back: freshNameSide() },
  size: '',
};

const euro = (n) => '€' + n.toFixed(2).replace('.', ',');

const shareable = () => ({
  color: state.color,
  logo: { front: { transform: state.logo.front.transform }, back: { transform: state.logo.back.transform } },
  name: state.name,
  size: state.size,
});

function applySaved(saved) {
  if (!saved) return;
  if (COLORS.some((c) => c.name === saved.color)) state.color = saved.color;
  SIDES.forEach((side) => {
    // Het geüploade bestand zelf (File/Image) overleeft een paginaherlaad
    // sowieso niet en wordt dus bewust nooit hersteld — alleen de gekozen
    // positie/schaal/rotatie, zodat een nieuwe upload daar meteen op staat.
    const l = saved.logo?.[side];
    if (l?.transform) Object.assign(state.logo[side].transform, l.transform);

    const n = saved.name?.[side];
    if (n) {
      if (typeof n.text === 'string') state.name[side].text = n.text.slice(0, 20);
      if (NAME_FONTS.some((f) => f.id === n.font)) state.name[side].font = n.font;
      if (NAME_SIZES.some((s) => s.id === n.size)) state.name[side].size = n.size;
      if (COLORS.some((c) => c.name === n.color)) state.name[side].color = n.color;
      if (n.transform) Object.assign(state.name[side].transform, n.transform);
    }
  });
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
// terwijl de klant het logo of de naam met de muis/touch over het shirt
// sleept — `side` geeft aan welke van de twee (voor/achter) instanties het
// betreft, zodat de andere kant onaangeroerd blijft.
const viewer = createShirtViewer(canvas, {
  onArtworkDrag: (side, t) => {
    state.logo[side].transform = t;
    syncArtworkPositionUI(side, t);
    save();
  },
  onNameDrag: (side, t) => {
    state.name[side].transform = t;
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

/* ── Productselector (Model-rij bovenaan) ────────────────────────────────
   Zelfde 4 tegels als de bokshandschoen-configurator laat zien (buildModelList
   in configurator/js/configurator.js), maar dan vanaf DEZE pagina: puur
   navigatie, geen eigen model-switch-logica (dit product heeft er maar één).
   Bewust een eigen, losstaande kopie i.p.v. een gedeelde module — zelfde
   architectuurkeuze als de rest van dit bestand, zodat een wijziging hier
   nooit de andere producten kan raken. Velcro/Lace-Up linken met ?model=…
   naar de bokshandschoen-pagina, die dat leest om meteen het juiste model
   te tonen i.p.v. het laatst-gebruikte. */
function buildProductNav() {
  const wrap = $('model-list');
  if (!wrap) return;
  const items = [
    { id: 'velcro', label: 'Velcro', sub: 'Klittenbandsluiting', href: '/configurator/index.html?model=velcro' },
    { id: 'laceup', label: 'Lace-Up', sub: 'Vetersluiting', href: '/configurator/index.html?model=laceup' },
    { id: 'shirt', label: 'T-shirt', sub: 'Fight Jersey', href: '/configurator-shirt/index.html', active: true },
    { id: 'shinguard', label: 'Scheenbeschermer', sub: 'Protector', href: '/configurator-shinguard/index.html' },
  ];
  wrap.innerHTML = '';
  items.forEach((it) => {
    const node = el(it.active ? 'span' : 'a', 'model-item' + (it.active ? ' is-active' : ''));
    if (!it.active) { node.href = it.href; node.style.textDecoration = 'none'; }
    else node.setAttribute('aria-current', 'page');
    node.append(el('span', 'model-name', it.label), el('span', 'model-sub', it.sub));
    wrap.appendChild(node);
  });
}

function pushName(side) {
  const s = state.name[side];
  const font = NAME_FONTS.find((f) => f.id === s.font) || NAME_FONTS[0];
  const size = NAME_SIZES.find((sz) => sz.id === s.size) || NAME_SIZES[2];
  viewer.setName(s.text.trim() ? {
    text: s.text.trim(), color: hexOf(s.color), fontCss: font.css, fontScale: size.scale,
  } : null, side, s.transform);
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

/** Generieke schuifregelaar op een willekeurig transform-object (i.p.v. een
 *  vast state-veld), zodat dezelfde functie voor de front- én back-instantie
 *  van het logo hergebruikt kan worden. */
function slider(transformObj, label, key, min, max, step, fmt, onChange) {
  const row = el('div', 'ctrl-row');
  const head = el('div', 'ctrl-head');
  const val = el('span', 'ctrl-value', fmt(transformObj[key]));
  head.append(el('span', 'ctrl-label', label), val);
  const input = document.createElement('input');
  input.type = 'range'; input.min = min; input.max = max; input.step = step;
  input.value = transformObj[key];
  input.addEventListener('input', () => {
    transformObj[key] = parseFloat(input.value);
    val.textContent = fmt(transformObj[key]);
    onChange();
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
// logo/naam: in-/uitklappen verandert dus nooit de gekozen kleur, logo's,
// namen of hun posities.
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

/* ── Eigen logo/ontwerp — los op voorkant én achterkant ──────────────────── */
// {x,y}-sliderrefs per kant, live bijgewerkt tijdens slepen op het canvas.
const artworkPositionSliders = { front: null, back: null };

function syncArtworkPositionUI(side, t) {
  const refs = artworkPositionSliders[side];
  if (!refs) return;
  refs.x.input.value = t.x;
  refs.x.val.textContent = `${Math.round(t.x * 200)}%`;
  refs.y.input.value = t.y;
  refs.y.val.textContent = `${Math.round(t.y * 200)}%`;
}

function buildLogoSide(box, side) {
  const s = state.logo[side];
  artworkPositionSliders[side] = null;

  const wrap = el('div', 'stack');
  wrap.style.marginTop = '14px';
  wrap.appendChild(el('span', 'field-label', SIDE_LABEL[side]));

  const dz = dropzone(
    `Sleep je logo hierheen (${SIDE_LABEL[side].toLowerCase()})`,
    'of klik om te kiezen · PNG, JPG of SVG · max 5MB',
    (img, file) => {
      s.transform = defaultArtworkTransform();
      s.hasArtwork = true;
      s.artworkFile = file || null;
      viewer.setArtwork(img, s.transform, side);
      buildArtworkPanel(); renderPrice(); save();
    },
  );
  wrap.appendChild(dz.zone);

  if (s.hasArtwork) {
    const tools = el('div', 'stack');
    tools.style.marginTop = '10px';
    const onChange = () => { viewer.setArtworkTransform(s.transform, side); save(); };
    const sx = slider(s.transform, 'Horizontaal', 'x', -0.5, 0.5, 0.01, (v) => `${Math.round(v * 200)}%`, onChange);
    const sy = slider(s.transform, 'Verticaal', 'y', -0.5, 0.5, 0.01, (v) => `${Math.round(v * 200)}%`, onChange);
    const ss = slider(s.transform, 'Grootte', 'scale', 0.2, 3, 0.01, (v) => `${Math.round(v * 100)}%`, onChange);
    const sr = slider(s.transform, 'Rotatie', 'rotation', -180, 180, 1, (v) => `${Math.round(v)}°`, onChange);
    artworkPositionSliders[side] = { x: sx, y: sy };
    const clear = el('button', 'btn btn-quiet btn-full', `Logo ${SIDE_LABEL[side].toLowerCase()} verwijderen`);
    clear.type = 'button';
    clear.addEventListener('click', () => {
      s.hasArtwork = false;
      s.artworkFile = null;
      viewer.setArtwork(null, null, side);
      buildArtworkPanel(); renderPrice(); save();
    });
    tools.append(sx.row, sy.row, ss.row, sr.row, clear);
    wrap.appendChild(tools);
  }
  box.appendChild(wrap);
}

function buildArtworkPanel() {
  const box = $('artwork-panel');
  box.innerHTML = '';

  const h = el('h2', 'card-title', 'Eigen logo / ontwerp');
  h.appendChild(el('span', 'price-tag', `+ ${euro(PRICING.customLogo)}`));
  box.appendChild(h);
  box.appendChild(el('p', 'hint', 'Upload je eigen logo of ontwerp — apart voor voor- en achterkant — en sleep het naar de gewenste plek op het shirt.'));

  SIDES.forEach((side) => buildLogoSide(box, side));
}

/* ── Naam — los op voorkant én achterkant ────────────────────────────────── */
function buildNameSide(box, side) {
  const s = state.name[side];

  const wrap = el('div', 'stack');
  wrap.style.marginTop = '14px';
  wrap.appendChild(el('span', 'field-label', SIDE_LABEL[side]));

  const input = document.createElement('input');
  input.className = 'input';
  input.type = 'text';
  input.maxLength = 20;
  input.placeholder = 'JOUW NAAM';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.value = s.text;
  input.addEventListener('input', () => {
    s.text = input.value.slice(0, 20);
    pushName(side); renderPrice(); save();
  });
  wrap.appendChild(input);

  const fontLabel = el('label', 'field-label', 'Lettertype');
  wrap.appendChild(fontLabel);
  const fontSel = document.createElement('select');
  fontSel.className = 'input select';
  NAME_FONTS.forEach((f) => {
    const o = document.createElement('option');
    o.value = f.id; o.textContent = f.label;
    fontSel.appendChild(o);
  });
  fontSel.value = s.font;
  fontSel.addEventListener('change', () => { s.font = fontSel.value; pushName(side); save(); });
  wrap.appendChild(fontSel);

  wrap.appendChild(el('span', 'field-label', 'Grootte'));
  const sizeWrap = el('div', 'size-row');
  NAME_SIZES.forEach((sz) => {
    const b = el('button', sz.id === s.size ? 'is-active' : '', sz.label);
    b.type = 'button';
    b.setAttribute('aria-label', `Tekstgrootte ${sz.id}`);
    b.addEventListener('click', () => {
      s.size = sz.id;
      sizeWrap.querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      pushName(side); save();
    });
    sizeWrap.appendChild(b);
  });
  wrap.appendChild(sizeWrap);

  const inlineField = el('div', 'inline-field');
  inlineField.appendChild(el('span', 'field-label no-margin', 'Tekstkleur'));
  inlineField.appendChild(swatchGrid(s.color, (c) => { s.color = c.name; pushName(side); save(); }, 'mini-swatches'));
  wrap.appendChild(inlineField);

  box.appendChild(wrap);
}

function buildNamePanel() {
  const box = $('name-card');
  box.innerHTML = '';

  const h = el('h2', 'card-title', 'Naam toevoegen');
  h.appendChild(el('span', 'opt', 'optioneel'));
  h.appendChild(el('span', 'price-tag', `+ ${euro(PRICING.name)}`));
  box.appendChild(h);
  box.appendChild(el('p', 'hint', 'Voeg een naam toe op de voorkant en/of de achterkant — beide onafhankelijk te verslepen op het shirt.'));

  SIDES.forEach((side) => buildNameSide(box, side));
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

function hasAnyLogo() { return state.logo.front.hasArtwork || state.logo.back.hasArtwork; }
function hasAnyName() { return !!(state.name.front.text.trim() || state.name.back.text.trim()); }

function renderPrice() {
  const rows = [['Shirt', PRICING.base]];
  if (hasAnyLogo()) rows.push(['Eigen logo/ontwerp', PRICING.customLogo]);
  if (hasAnyName()) rows.push(['Naam', PRICING.name]);
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
function sideImageConfig(side) {
  const s = state.logo[side];
  return s.hasArtwork ? { placement: SIDE_LABEL[side], transform: { ...s.transform } } : null;
}
function sideNameConfig(side) {
  const s = state.name[side];
  if (!s.text.trim()) return null;
  return {
    text: s.text.trim(), color: s.color,
    font: (NAME_FONTS.find((f) => f.id === s.font) || {}).label, size: s.size,
    placement: SIDE_LABEL[side], transform: { ...s.transform },
  };
}

function buildConfig() {
  const logoFront = sideImageConfig('front');
  const logoBack = sideImageConfig('back');
  const nameFront = sideNameConfig('front');
  const nameBack = sideNameConfig('back');
  return {
    product: 'Custom Fight Jersey',
    size: state.size,
    color: state.color,
    customImage: (logoFront || logoBack) ? { front: logoFront, back: logoBack } : null,
    name: (nameFront || nameBack) ? { front: nameFront, back: nameBack } : null,
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

async function sideImageProduction(designId, side) {
  const s = state.logo[side];
  if (!s.hasArtwork) return null;
  const obj = { placement: SIDE_LABEL[side], transform: { ...s.transform } };
  if (s.artworkFile) {
    obj.originalFilename = s.artworkFile.name;
    obj.originalMimeType = s.artworkFile.type || null;
    obj.originalUrl = await uploadDesignAsset(designId, 'original', side, s.artworkFile, s.artworkFile.name);
  }
  const artCanvas = viewer.getArtworkCanvas(side, 2048);
  if (artCanvas) {
    const blob = await canvasToPngBlob(artCanvas);
    if (blob) obj.artworkUrl = await uploadDesignAsset(designId, 'artwork', side, blob, `${side}-artwork.png`);
  }
  return obj;
}

async function buildProductionConfig(designId) {
  const logoFront = await sideImageProduction(designId, 'front');
  const logoBack = await sideImageProduction(designId, 'back');
  const nameFront = sideNameConfig('front');
  const nameBack = sideNameConfig('back');

  let shirtPreviewUrl = null;
  {
    viewer.renderNow();
    const dataUrl = viewer.captureHighResPNG({ width: 1600, height: 1600, preset: 'front' });
    const previewBlob = dataUrlToBlob(dataUrl);
    shirtPreviewUrl = await uploadDesignAsset(designId, 'preview', 'general', previewBlob, 'shirt-preview.png');
  }

  const hasLogo = !!(logoFront || logoBack);
  const hasName = !!(nameFront || nameBack);
  const logoSurcharge = hasLogo ? PRICING.customLogo : 0;
  const nameSurcharge = hasName ? PRICING.name : 0;
  const displayedTotal = Math.round((PRICING.base + logoSurcharge + nameSurcharge) * 100) / 100;

  return {
    designId,
    product: 'Custom Fight Jersey',
    size: state.size,
    color: state.color,
    customImage: hasLogo ? { front: logoFront, back: logoBack } : null,
    name: hasName ? { front: nameFront, back: nameBack } : null,
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
    state.logo = { front: freshLogoSide(), back: freshLogoSide() };
    state.name = { front: freshNameSide(), back: freshNameSide() };
    state.size = '';
    SIDES.forEach((side) => { viewer.setArtwork(null, null, side); viewer.setName(null, side); });
    localStorage.removeItem(STORE_KEY);
    location.reload();
  });
}

viewer.ready.then(async () => {
  $('stage-loading').classList.add('is-hidden');
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch (e) { /* niet kritiek */ } }
  buildProductNav();
  buildColorPanel();
  buildArtworkPanel();
  buildNamePanel();
  buildSizePanel();
  renderPrice();
  wireActions();
  viewer.setShirtColor(hexOf(state.color));
  SIDES.forEach((side) => pushName(side));
}).catch((err) => {
  console.error('[3D] laden mislukt:', err);
  $('stage-loading').classList.add('is-hidden');
  $('stage-error').hidden = false;
  $('stage-error').textContent =
    'Het 3D-model kon niet geladen worden. Open deze pagina via een webserver — ' +
    'direct openen vanaf je schijf blokkeert het laden van de GLB en de modules.';
});
