/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — Glove Configurator (UI-laag)
   Stuurt de 3D-viewer (scene3d.js) aan; bevat geen render-logica zelf.
   ═══════════════════════════════════════════════════════════════════════════ */
import { createGloveViewer } from './scene3d.js';

/* ── Palet: 16 kleuren ─────────────────────────────────────────────────── */
const COLORS = [
  { name: 'Black',      hex: '#14161A' },
  { name: 'White',      hex: '#F5F6F7' },
  { name: 'Silver',     hex: '#C9CDD3' },
  { name: 'Gold',       hex: '#C8A23C' },
  { name: 'Grey',       hex: '#7C828B' },
  { name: 'Red',        hex: '#C8202E' },
  { name: 'Wine Red',   hex: '#6E1F2E' },
  { name: 'Orange',     hex: '#E2701E' },
  { name: 'Yellow',     hex: '#E8C222' },
  { name: 'Royal Blue', hex: '#2743C4' },
  { name: 'Navy Blue',  hex: '#16224A' },
  { name: 'Sky Blue',   hex: '#4FA8DE' },
  { name: 'Purple',     hex: '#5F2C90' },
  { name: 'Pink',       hex: '#DE6A9E' },
  { name: 'Green',      hex: '#1F7A44' },
  { name: 'Teal',       hex: '#12857E' },
];

/* ── De 13 kleurregelaars ────────────────────────────────────────────────
   kind: 'mesh'  → bestaat als los 3D-object, kleur = echt materiaal
   kind: 'decal' → bestaat niet als losse geometrie, kleur = canvas-textuur */
const PARTS = [
  { key: 'topPanel',   zone: 'top-panel',   kind: 'mesh',  label: 'Top Panel',   def: 'Black' },
  { key: 'frontPanel', zone: 'front-panel', kind: 'mesh',  label: 'Front Panel', def: 'Black' },
  { key: 'palm',       zone: 'palm',        kind: 'mesh',  label: 'Palm',        def: 'Black' },
  { key: 'palmBack',   zone: 'palm-back',   kind: 'mesh',  label: 'Palm Back',   def: 'Black' },
  { key: 'outerThumb', zone: 'outer-thumb', kind: 'mesh',  label: 'Outer Thumb', def: 'Black' },
  { key: 'innerThumb', zone: 'inner-thumb', kind: 'mesh',  label: 'Inner Thumb', def: 'Black' },
  { key: 'wrist',      zone: 'wrist',       kind: 'mesh',  label: 'Wrist',       def: 'Black' },
  { key: 'trim',       zone: 'trim',        kind: 'decal', label: 'Trim',        def: 'Gold' },
  { key: 'piping',     zone: 'piping',      kind: 'decal', label: 'Piping',      def: 'Gold' },
  { key: 'laces',      zone: 'laces',       kind: 'decal', label: 'Laces',       def: 'White' },
  { key: 'stitching',  zone: 'stitching',   kind: 'decal', label: 'Stitching',   def: 'White' },
  { key: 'logo',       zone: 'logo',        kind: 'decal', label: 'Logo',        def: 'Gold' },
  { key: 'name',       zone: 'name',        kind: 'decal', label: 'Naam',        def: 'White' },
];

const STORE_KEY = 'fm-glove-3d-config-v1';

const state = { colors: {}, name: '' };
PARTS.forEach((p) => { state.colors[p.key] = p.def; });

function hexOf(colorName) {
  return (COLORS.find((c) => c.name === colorName) || COLORS[0]).hex;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    PARTS.forEach((p) => {
      if (saved.colors && typeof saved.colors[p.key] === 'string' && hexOf(saved.colors[p.key])) {
        state.colors[p.key] = saved.colors[p.key];
      }
    });
    if (typeof saved.name === 'string') state.name = saved.name.slice(0, 12);
  } catch (e) { /* corrupte opslag negeren */ }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

/* ── DOM ──────────────────────────────────────────────────────────────── */
const canvas       = document.getElementById('glove-canvas');
const stageLoading  = document.getElementById('stage-loading');
const stageError    = document.getElementById('stage-error');
const partsWrap     = document.getElementById('parts');
const nameInput      = document.getElementById('name-input');
const resetBtn       = document.getElementById('reset');
const logoFileInput  = document.getElementById('logo-file');
const logoUploadText = document.getElementById('logo-upload-text');

const viewer = createGloveViewer(canvas);

viewer.ready.then(() => {
  stageLoading.classList.add('is-hidden');
  applyAll();
}).catch((err) => {
  console.error('[3D] laden mislukt:', err);
  stageLoading.classList.add('is-hidden');
  stageError.hidden = false;
  stageError.textContent =
    'Het 3D-model kon niet geladen worden. Open deze pagina via een webserver ' +
    '(bijvoorbeeld http://localhost:5174/configurator/) — direct openen vanaf ' +
    'je schijf blokkeert het laden van de GLB en de module-imports.';
});

function applyPart(part) {
  const hex = hexOf(state.colors[part.key]);
  if (part.kind === 'mesh') {
    viewer.setZoneColor(part.zone, hex);
  } else if (part.key === 'name') {
    viewer.setDecalColor('name', hex, { text: state.name });
  } else {
    viewer.setDecalColor(part.zone, hex);
  }
}
function applyAll() { PARTS.forEach(applyPart); }

/* ── Kleurenraster bouwen ─────────────────────────────────────────────── */
function buildParts() {
  PARTS.forEach((part, index) => {
    const row = document.createElement('div');
    row.className = 'part';

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'part-head';
    head.setAttribute('aria-expanded', 'false');

    const dot = document.createElement('span');
    dot.className = 'part-dot';
    dot.style.background = hexOf(state.colors[part.key]);

    const name = document.createElement('span');
    name.className = 'part-name';
    name.textContent = part.label;
    if (part.kind === 'decal') {
      const tag = document.createElement('span');
      tag.className = 'part-tag';
      tag.textContent = 'decal';
      name.appendChild(tag);
    }

    const value = document.createElement('span');
    value.className = 'part-value';
    value.textContent = state.colors[part.key];

    const caret = document.createElement('span');
    caret.className = 'part-caret';

    head.append(dot, name, value, caret);

    const body = document.createElement('div');
    body.className = 'part-body';
    const grid = document.createElement('div');
    grid.className = 'swatches';

    COLORS.forEach((c) => {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'swatch' + (state.colors[part.key] === c.name ? ' is-selected' : '');
      sw.style.background = c.hex;
      sw.title = c.name;
      sw.setAttribute('aria-label', part.label + ': ' + c.name);
      sw.addEventListener('click', () => {
        state.colors[part.key] = c.name;
        grid.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-selected'));
        sw.classList.add('is-selected');
        dot.style.background = c.hex;
        value.textContent = c.name;
        applyPart(part);
        save();
      });
      grid.appendChild(sw);
    });

    body.appendChild(grid);
    row.append(head, body);
    partsWrap.appendChild(row);

    head.addEventListener('click', () => {
      const open = row.classList.contains('is-open');
      partsWrap.querySelectorAll('.part').forEach((r) => {
        r.classList.remove('is-open');
        r.querySelector('.part-head').setAttribute('aria-expanded', 'false');
      });
      if (!open) { row.classList.add('is-open'); head.setAttribute('aria-expanded', 'true'); }
    });

    if (index === 0) { row.classList.add('is-open'); head.setAttribute('aria-expanded', 'true'); }
  });
}

/* ── Naam ─────────────────────────────────────────────────────────────── */
nameInput.addEventListener('input', () => {
  state.name = nameInput.value.slice(0, 12);
  const namePart = PARTS.find((p) => p.key === 'name');
  applyPart(namePart);
  save();
});

/* ── Logo-upload ──────────────────────────────────────────────────────── */
logoFileInput.addEventListener('change', () => {
  const file = logoFileInput.files && logoFileInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    viewer.setDecalImage('logo', img);
    logoUploadText.textContent = file.name;
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { logoUploadText.textContent = 'Upload mislukt — probeer een andere afbeelding.'; };
  img.src = url;
});

/* ── Camera-presets ───────────────────────────────────────────────────── */
document.querySelectorAll('.view-btn[data-cam]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn[data-cam]').forEach((b) => {
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
    viewer.goToPreset(btn.getAttribute('data-cam'));
  });
});
document.getElementById('cam-reset').addEventListener('click', () => {
  document.querySelectorAll('.view-btn[data-cam]').forEach((b, i) => {
    const on = i === 0;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  viewer.goToPreset('front');
});

/* ── Reset ────────────────────────────────────────────────────────────── */
resetBtn.addEventListener('click', () => {
  PARTS.forEach((p) => { state.colors[p.key] = p.def; });
  state.name = '';
  nameInput.value = '';
  logoUploadText.textContent = 'Kies een afbeelding';
  partsWrap.innerHTML = '';
  buildParts();
  applyAll();
  save();
});

/* ── Start ────────────────────────────────────────────────────────────── */
load();
buildParts();
nameInput.value = state.name;
