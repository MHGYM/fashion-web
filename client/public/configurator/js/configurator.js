/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — Glove Configurator (UI-laag)
   ═══════════════════════════════════════════════════════════════════════════
   Bouwt zichzelf op uit de productdefinitie (zones.js) en praat met de 3D-laag
   uitsluitend via zone-id's. Kent geen meshnamen of modeldetails: een ander
   GLB vergt hier géén wijziging.

   Flow bewust in deze volgorde (zie index.html): model → onderdeel-tabs →
   3D-resultaat → kleur/upload voor dát onderdeel — allemaal dicht opeen in
   dezelfde kolom, zodat "zone kiezen → kleur kiezen → resultaat zien" geen
   scroll-afstand kost, ook niet op mobiel.
   ═══════════════════════════════════════════════════════════════════════════ */

import { createGloveViewer } from './scene3d.js';
import { MODELS, MODEL_BY_ID, DEFAULT_MODEL_ID } from './model-profile.js';
import {
  COLORS, ZONES, SIZES, PRICING, NAME_FONTS, NAME_SIZES,
  hexOf, defaultColors, defaultArtworkTransform,
} from './zones.js';

const STORE_KEY = 'fm-glove-config-v4';
const API = '/api/customizer';
const PRODUCT_KEY = 'custom-gloves';

const state = {
  model: DEFAULT_MODEL_ID,
  colors: defaultColors(),
  artworkTransform: defaultArtworkTransform(),
  hasArtwork: false,
  hasLogo: false,
  // Origineel geüploade bestanden (File-objecten) — bewaard náást de Image
  // die de 3D-preview draagt, puur zodat het EXACTE originele bestand
  // (resolutie/formaat ongewijzigd) meegestuurd kan worden bij "In
  // winkelwagen". Nooit opgeslagen/gedeeld via localStorage (te groot, en
  // een File overleeft een paginaherlaad toch niet) — alleen in-memory
  // zolang de klant op deze pagina is.
  artworkFile: null,
  logoFile: null,
  name: '',
  nameFont: NAME_FONTS[0].id,
  nameSize: 'm',
  nameColor: 'White',
  size: '',
  activeZone: ZONES[0].id,
};

const euro = (n) => '€' + n.toFixed(2).replace('.', ',');

/** Sommige modellen willen een gedeelde zone-id anders noemen — bv. Lace-Up
 *  toont zone-id 'front-panel' als "Back Panel" (het is daar het vlak
 *  tegenover de knokkelkap, i.p.v. het slagvlak zoals bij Velcro). zones.js
 *  blijft model-onafhankelijk; dit overschrijft alleen wat de KLANT leest,
 *  niet de zone-id zelf (die blijft overal 'front-panel', dus opslag/cart/
 *  productiebestand/Velcro blijven ongewijzigd). */
function zoneDisplay(zone) {
  const o = MODEL_BY_ID[state.model]?.zoneOverrides?.[zone.id];
  return { label: o?.label ?? zone.label, hint: o?.hint ?? zone.hint, hidden: !!o?.hidden };
}

// Puur UI-voorkeur (in-/uitgeklapt), geen onderdeel van de configuratie:
// niet in `state`, dus niet opgeslagen/gedeeld. Blijft wel gelden zolang de
// klant tussen zones wisselt, tot de pagina herlaadt.
let colorPanelOpen = true;

/* ── Opslag + deelbare link ───────────────────────────────────────────── */
// Alleen instellingen, geen afbeeldingen: die zijn te groot voor een URL en
// blijven bij de klant tot ze bij het bestellen geüpload worden.
const shareable = () => ({
  model: state.model,
  colors: state.colors, artworkTransform: state.artworkTransform,
  name: state.name, nameFont: state.nameFont, nameSize: state.nameSize,
  nameColor: state.nameColor, size: state.size,
});

function applySaved(saved) {
  if (!saved) return;
  if (MODEL_BY_ID[saved.model]) state.model = saved.model;
  ZONES.forEach((z) => {
    const c = saved.colors?.[z.id];
    if (typeof c === 'string' && COLORS.some((x) => x.name === c)) state.colors[z.id] = c;
  });
  if (saved.artworkTransform) Object.assign(state.artworkTransform, saved.artworkTransform);
  if (typeof saved.name === 'string') state.name = saved.name.slice(0, 14);
  if (NAME_FONTS.some((f) => f.id === saved.nameFont)) state.nameFont = saved.nameFont;
  if (NAME_SIZES.some((s) => s.id === saved.nameSize)) state.nameSize = saved.nameSize;
  if (COLORS.some((c) => c.name === saved.nameColor)) state.nameColor = saved.nameColor;
  if (SIZES.includes(saved.size)) state.size = saved.size;
}

function load() {
  // Een gedeelde link wint van wat lokaal is opgeslagen.
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
const canvas = $('glove-canvas');

// Eerst de opgeslagen/gedeelde instellingen inlezen, dán de viewer starten:
// zo wordt bij een gedeelde link met een ander model meteen het juiste bestand
// geladen in plaats van eerst het standaardmodel en dan omwisselen.
load();
const viewer = createGloveViewer(canvas, { profile: MODEL_BY_ID[state.model] });

// Het naam-op-de-manchet-blok staat vast in de HTML maar hoort inhoudelijk
// bij de Wrist-zone: buildZoneEditor() verplaatst dit ENE element erin/eruit
// (nooit klonen) zodat getypte tekst en gekozen opties nooit verloren gaan.
const wristNameCard = $('wrist-name-card');
const detachedHolder = document.createElement('div'); // nooit in de document-DOM; alleen een veilige parkeerplek

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
const BADGE_ZONE = ZONES.find((z) => z.artwork === 'badge');
const FULL_ZONE  = ZONES.find((z) => z.artwork === 'full');

function pushColors() {
  ZONES.forEach((z) => {
    if (viewer.isZoneSupported(z.id)) viewer.setZoneColor(z.id, hexOf(state.colors[z.id]));
  });
}
function pushBadge() {
  if (!BADGE_ZONE) return;
  const font = NAME_FONTS.find((f) => f.id === state.nameFont) || NAME_FONTS[0];
  const size = NAME_SIZES.find((s) => s.id === state.nameSize) || NAME_SIZES[2];
  viewer.setZoneBadge(BADGE_ZONE.id, {
    text: state.name,
    textColor: hexOf(state.nameColor),
    fontCss: font.css,
    fontScale: size.scale,
  });
}

/* ── Model kiezen ─────────────────────────────────────────────────────── */
function buildModelList() {
  const wrap = $('model-list');
  wrap.innerHTML = '';
  MODELS.forEach((m) => {
    const btn = el('button', 'model-item' + (m.id === state.model ? ' is-active' : ''));
    btn.type = 'button';
    btn.setAttribute('aria-pressed', m.id === state.model ? 'true' : 'false');
    btn.append(el('span', 'model-name', m.label), el('span', 'model-sub', m.sublabel || ''));
    btn.addEventListener('click', () => { if (m.id !== state.model) switchModel(m.id); });
    wrap.appendChild(btn);
  });

  // T-shirt is geen bokshandschoen-model (ander mesh/zone-systeem, eigen
  // pagina) en kan dus niet via switchModel() ingeladen worden — dit is
  // een gewone link naar /configurator-shirt/, alleen visueel als tegel
  // meegenomen in dezelfde rij zodat de klant ook dit product hier vindt.
  // Expliciet index.html (i.p.v. alleen de map): de Vite-dev-server doet,
  // anders dan de Express-productieserver, geen directory-index-fallback
  // voor statische pagina's — zonder bestandsnaam laadt dit lokaal de
  // React-SPA i.p.v. de T-shirt-configurator. Werkt met index.html in
  // beide omgevingen identiek.
  const shirtLink = el('a', 'model-item');
  shirtLink.href = '/configurator-shirt/index.html';
  shirtLink.style.textDecoration = 'none';
  shirtLink.append(el('span', 'model-name', 'T-shirt'), el('span', 'model-sub', 'Fight Jersey'));
  wrap.appendChild(shirtLink);
}

/** Wisselt van 3D-model en zet alle instellingen opnieuw toe. */
async function switchModel(modelId) {
  state.model = modelId;
  buildModelList();
  $('stage-loading').classList.remove('is-hidden');
  try {
    await viewer.loadModel(MODEL_BY_ID[modelId]);
    // Kleuren/naam opnieuw doorgeven: het nieuwe model heeft verse materialen.
    pushColors();
    pushBadge();
    // Zone-artwork gaat bewust NIET mee: de UV-indeling verschilt per model,
    // dus een upload zou op een onvoorspelbare plek belanden.
    state.hasArtwork = false;
    state.hasLogo = false;
    state.artworkFile = null;
    state.logoFile = null;
    if (!viewer.isZoneSupported(state.activeZone)) {
      state.activeZone = (ZONES.find((z) => viewer.isZoneSupported(z.id)) || ZONES[0]).id;
    }
    buildZoneTabs();
    buildZoneEditor();
    renderPrice();
    showAttribution();
    save();
  } catch (e) {
    console.error('[3D] modelwissel mislukt:', e);
  }
  $('stage-loading').classList.add('is-hidden');
}

/* ── Onderdeel kiezen: compacte pillen boven het 3D-podium ───────────────
   Bewust GEEN beschrijvende lijst meer (kleurstip + naam + toelichting per
   rij) — die stond ver van het 3D-resultaat af. De toelichting per zone
   verschijnt nu als stage-hint, direct bij de viewer zelf.              */
function buildZoneTabs() {
  const wrap = $('zone-tabs');
  wrap.innerHTML = '';
  ZONES.forEach((zone) => {
    // Een zone-id die op dit model bewust hergebruikt/hernoemd is naar een
    // andere, al zichtbare tab (zie zoneOverrides) hoeft niet ook nog als
    // losse, altijd-onbeschikbare "n.v.t."-tab getoond te worden — dat zou
    // twee tabs met dezelfde naam geven. Alleen relevant voor het model dat
    // dit expliciet aanvinkt; andere modellen (bv. Velcro) tonen 'm gewoon.
    if (zoneDisplay(zone).hidden) return;
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
    if (ok && ((zone.id === FULL_ZONE?.id && state.hasArtwork) ||
               (zone.id === BADGE_ZONE?.id && state.hasLogo))) dot.classList.add('has-art');

    btn.append(dot, document.createTextNode(zoneDisplay(zone).label));
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

/** Uploadvak met klik én slepen-en-neerzetten. */
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

  // Het naam-paneel bevat live invoer (getypte naam, gekozen opties). Eerst
  // veilig parkeren als het nu in box zit, want innerHTML='' zou die DOM
  // anders vernietigen i.p.v. hem alleen te verbergen.
  if (wristNameCard.parentNode === box) detachedHolder.appendChild(wristNameCard);
  box.innerHTML = '';
  if (!zone) return;

  const disp = zoneDisplay(zone);
  $('stage-title').textContent = disp.label;
  $('stage-hint').textContent = disp.hint;

  // Inklapbare kleursectie: dicht toont alleen "KLEUR" + de gekozen kleur
  // (de stip in de header, altijd zichtbaar, ook ingeklapt); open toont het
  // volledige palet. Toggle herbouwt bewust NIET de hele editor — dat zou
  // bij het kiezen van een kleur het paneel weer laten "springen".
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
    // Een 'mesh-group'-zone (bv. Lace-Up's "Thumb" = Outer Thumb + Inner
    // Thumb tegelijk) stuurt in de 3D-viewer al de onderliggende zones aan;
    // hier ook hun eigen state.colors bijwerken zodat de opgeslagen
    // configuratie, een gedeelde link en het productiebestand exact
    // overeenkomen met wat er te zien is — anders zou bv. Outer Thumb apart
    // geopend nog de oude kleur tonen terwijl het 3D-model al de nieuwe toont.
    const binding = MODEL_BY_ID[state.model]?.bindings?.[zone.id];
    if (binding?.type === 'mesh-group') {
      binding.nodes.forEach((id) => { state.colors[id] = c.name; });
    }
    viewer.setZoneColor(zone.id, c.hex);
    colorDot.style.background = c.hex;
    buildZoneTabs();
    save();
  }));
  box.appendChild(colorPanel);

  if (zone.artwork === 'full') {
    box.appendChild(el('div', 'divider'));
    // "Eigen logo", niet "Eigen afbeelding": moet letterlijk overeenkomen met
    // de regel "Eigen logo" die renderPrice() al toont, anders herkent een
    // klant dit niet als dezelfde toeslag/functie.
    const hFull = el('h2', 'card-title', 'Eigen logo');
    hFull.appendChild(el('span', 'price-tag', `+ ${euro(PRICING.customLogo)}`));
    box.appendChild(hFull);
    box.appendChild(el('p', 'hint', `Upload je eigen logo op de ${zoneDisplay(zone).label} — het dekt automatisch het hele paneel én de duim, als één geheel.`));
    const dz = dropzone('Sleep je logo hierheen', 'of klik om te kiezen · PNG, JPG of SVG · max 5MB',
      (img, file) => {
        state.artworkTransform = defaultArtworkTransform();
        state.hasArtwork = true;
        state.artworkFile = file || null;
        viewer.setZoneArtwork(zone.id, img, state.artworkTransform);
        buildZoneTabs(); buildZoneEditor(); renderPrice(); save();
      });
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

  if (zone.artwork === 'badge') {
    box.appendChild(el('div', 'divider'));
    const hBadge = el('h2', 'card-title', 'Logo op de manchet');
    // Zelfde toeslag als de Front Panel-afbeelding (zie renderPrice): één
    // vaste prijs voor "eigen logo/afbeelding", niet gestapeld als de klant
    // toevallig beide gebruikt.
    hBadge.appendChild(el('span', 'price-tag', `+ ${euro(PRICING.customLogo)}`));
    box.appendChild(hBadge);
    const dz = dropzone('Sleep je logo hierheen', 'of klik om te kiezen · PNG met transparantie werkt het best',
      (img, file) => {
        state.hasLogo = true;
        state.logoFile = file || null;
        viewer.setZoneBadge(zone.id, { img });
        buildZoneTabs(); buildZoneEditor(); renderPrice(); save();
      });
    box.appendChild(dz.zone);

    if (state.hasLogo) {
      const clear = el('button', 'btn btn-quiet btn-full', 'Logo verwijderen');
      clear.type = 'button';
      clear.style.marginTop = '10px';
      clear.addEventListener('click', () => {
        state.hasLogo = false;
        state.logoFile = null;
        viewer.setZoneBadge(zone.id, { img: null });
        buildZoneTabs(); buildZoneEditor(); renderPrice(); save();
      });
      box.appendChild(clear);
    }

    // Naam hoort bij dit onderdeel — verplaatst (niet herbouwd) het bestaande
    // paneel hierin, zodat de invoer + luisteraars intact blijven.
    wristNameCard.hidden = false;
    box.appendChild(wristNameCard);
  }
}

/* ── Naam op de manchet (leeft in #wrist-name-card, zie hierboven) ──────── */
function buildNamePanel() {
  const input = $('name-input');
  input.value = state.name;
  input.addEventListener('input', () => {
    state.name = input.value.slice(0, 14);
    pushBadge(); renderPrice(); save();
  });

  const fontSel = $('name-font');
  NAME_FONTS.forEach((f) => {
    const o = document.createElement('option');
    o.value = f.id; o.textContent = f.label;
    fontSel.appendChild(o);
  });
  fontSel.value = state.nameFont;
  fontSel.addEventListener('change', () => { state.nameFont = fontSel.value; pushBadge(); save(); });

  const sizeWrap = $('name-size');
  NAME_SIZES.forEach((s) => {
    const b = el('button', s.id === state.nameSize ? 'is-active' : '', s.label);
    b.type = 'button';
    b.setAttribute('aria-label', `Tekstgrootte ${s.id}`);
    b.addEventListener('click', () => {
      state.nameSize = s.id;
      sizeWrap.querySelectorAll('button').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      pushBadge(); save();
    });
    sizeWrap.appendChild(b);
  });

  $('name-color').appendChild(
    swatchGrid(state.nameColor, (c) => { state.nameColor = c.name; pushBadge(); save(); }, 'mini-swatches'),
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
  const rows = [['Handschoen', PRICING.base]];
  // Eén vaste toeslag voor "een eigen logo/afbeelding gebruiken", ongeacht
  // of dat via de Front Panel-afbeelding, het manchet-logo, of allebei is —
  // geen dubbele toeslag voor wat de klant als één keuze ervaart.
  if (state.hasArtwork || state.hasLogo) rows.push(['Eigen logo', PRICING.customLogo]);
  if (state.name.trim()) rows.push(['Naam borduren', PRICING.wristName]);

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

/** Lichte, synchrone momentopname (geen uploads) — gebruikt door
 *  window.FMConfigurator.getConfiguration() voor debug/inspectie. De
 *  daadwerkelijke "In winkelwagen"-config komt uit buildProductionConfig(). */
function buildConfig() {
  const zoneColors = {};
  ZONES.forEach((z) => { zoneColors[z.label] = state.colors[z.id]; });
  return {
    product: 'Custom Gloves',
    modelProfile: viewer.profile.id,
    size: state.size,
    colors: zoneColors,
    customImage: state.hasArtwork ? { placement: 'Front Panel (incl. duim)', transform: { ...state.artworkTransform } } : null,
    wristLogo: state.hasLogo ? { placement: 'Manchet' } : null,
    name: state.name.trim() ? {
      text: state.name.trim(),
      color: state.nameColor,
      font: (NAME_FONTS.find((f) => f.id === state.nameFont) || {}).label,
      size: state.nameSize,
    } : null,
  };
}

/** Leesbaar, verifieerbaar ontwerp-ID — reist mee in de config (order_items.
 *  custom_config) én is de mapnaam onder UPLOADS_DIR/designs/ waar de
 *  productiebestanden van dit ontwerp staan. Aangemaakt bij "In winkelwagen":
 *  vanaf dat moment is een ontwerp pas "compleet" (zie orderaanvraag). */
function makeDesignId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FM-${stamp}-${rand}`;
}

/** Upload één productiebestand (origineel/artwork/preview) voor `designId`.
 *  Zelfde auth-patroon als de rest van deze pagina (token uit localStorage,
 *  want dit is een losstaande statische pagina buiten de React-SPA). */
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

/** dataURL → Blob zonder fetch(): fetch('data:...') wordt door de CSP
 *  (connect-src/default-src 'self', geen data:) geblokkeerd, ook al mag
 *  data: wél als <img src>/canvas-bron (img-src staat dat toe). atob() is
 *  geen netwerkverzoek en valt dus buiten de CSP. */
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = (header.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Bouwt de volledige productieconfiguratie EN uploadt daarbij de bestanden
 * die de fabrikant nodig heeft: het originele klantbestand (ongewijzigde
 * resolutie/formaat), het artwork exact zoals het op de handschoen
 * gepositioneerd is (hoge resolutie, dezelfde tekenfunctie als de live 3D-
 * textuur maar op een grotere losse canvas), en een scherpe glove-preview.
 * Alleen aangeroepen bij "In winkelwagen" — dán is een ontwerp "compleet".
 */
async function buildProductionConfig(designId) {
  const zoneColors = {};
  ZONES.forEach((z) => { zoneColors[z.label] = state.colors[z.id]; });

  let customImage = null;
  if (state.hasArtwork) {
    customImage = { placement: 'Front Panel (incl. duim)', transform: { ...state.artworkTransform } };
    if (state.artworkFile) {
      customImage.originalFilename = state.artworkFile.name;
      customImage.originalMimeType = state.artworkFile.type || null;
      customImage.originalUrl = await uploadDesignAsset(designId, 'original', 'front-panel', state.artworkFile, state.artworkFile.name);
    }
    const artCanvas = viewer.getZoneArtworkCanvas(FULL_ZONE.id, 2048);
    if (artCanvas) {
      const blob = await canvasToPngBlob(artCanvas);
      if (blob) customImage.artworkUrl = await uploadDesignAsset(designId, 'artwork', 'front-panel', blob, 'front-panel-artwork.png');
    }
  }

  let wristLogo = null;
  if (state.hasLogo) {
    wristLogo = { placement: 'Manchet' };
    if (state.logoFile) {
      wristLogo.originalFilename = state.logoFile.name;
      wristLogo.originalMimeType = state.logoFile.type || null;
      wristLogo.originalUrl = await uploadDesignAsset(designId, 'original', 'wrist', state.logoFile, state.logoFile.name);
    }
    const artCanvas = BADGE_ZONE ? viewer.getZoneArtworkCanvas(BADGE_ZONE.id, 1600) : null;
    if (artCanvas) {
      const blob = await canvasToPngBlob(artCanvas);
      if (blob) wristLogo.artworkUrl = await uploadDesignAsset(designId, 'artwork', 'wrist', blob, 'wrist-logo-artwork.png');
    }
  }

  let glovePreviewUrl = null;
  {
    viewer.renderNow();
    const dataUrl = viewer.captureHighResPNG({ width: 1600, height: 1600, preset: viewer.cameraPresetNames[0] });
    const previewBlob = dataUrlToBlob(dataUrl);
    glovePreviewUrl = await uploadDesignAsset(designId, 'preview', 'general', previewBlob, 'glove-preview.png');
  }

  const nameObj = state.name.trim() ? {
    text: state.name.trim(),
    color: state.nameColor,
    font: (NAME_FONTS.find((f) => f.id === state.nameFont) || {}).label,
    size: state.nameSize,
  } : null;

  // Zelfde toeslag-regels als renderPrice() hierboven — puur informatief
  // (de server berekent de daadwerkelijk in rekening gebrachte prijs zelf
  // opnieuw bij /cart), maar wél nodig zodat de productiespecificatie een
  // eigen, leesbare prijsopbouw kan tonen zonder de UI-tekst te dupliceren.
  const logoSurcharge = (state.hasArtwork || state.hasLogo) ? PRICING.customLogo : 0;
  const embroiderySurcharge = nameObj ? PRICING.wristName : 0;
  const displayedTotal = Math.round((PRICING.base + logoSurcharge + embroiderySurcharge) * 100) / 100;

  return {
    designId,
    product: 'Custom Gloves',
    modelProfile: viewer.profile.id,
    modelLabel: viewer.profile.label,
    size: state.size,
    colors: zoneColors,
    customImage,
    wristLogo,
    name: nameObj,
    glovePreviewUrl,
    pricing: { base: PRICING.base, logoSurcharge, embroiderySurcharge, displayedTotal },
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

    // Zelfde boodschap als voorheen bij een 401 van de server, maar nu al
    // vóóraf gecontroleerd: zo worden er geen productiebestanden geüpload
    // voor een sessie die toch niet ingelogd is.
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
      a.download = 'fightmarketing-ontwerp.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  });

  $('reset').addEventListener('click', () => {
    state.colors = defaultColors();
    state.artworkTransform = defaultArtworkTransform();
    state.hasArtwork = false; state.hasLogo = false;
    state.artworkFile = null; state.logoFile = null;
    state.name = ''; state.size = '';
    state.nameFont = NAME_FONTS[0].id; state.nameSize = 'm'; state.nameColor = 'White';
    if (FULL_ZONE) viewer.setZoneArtwork(FULL_ZONE.id, null);
    if (BADGE_ZONE) viewer.setZoneBadge(BADGE_ZONE.id, { img: null, text: '' });
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
  // Wacht op de webfonts, anders tekent het canvas de naam in een fallback.
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch (e) { /* niet kritiek */ } }
  buildModelList();
  buildZoneTabs();
  buildZoneEditor();
  buildNamePanel();
  buildSizePanel();
  renderPrice();
  wireActions();
  showAttribution();
  pushColors();
  pushBadge();
}).catch((err) => {
  console.error('[3D] laden mislukt:', err);
  $('stage-loading').classList.add('is-hidden');
  $('stage-error').hidden = false;
  $('stage-error').textContent =
    'Het 3D-model kon niet geladen worden. Open deze pagina via een webserver — ' +
    'direct openen vanaf je schijf blokkeert het laden van de GLB en de modules.';
});
