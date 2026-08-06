/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — Glove Configurator (UI-laag)
   ═══════════════════════════════════════════════════════════════════════════
   Bouwt zichzelf op uit de productdefinitie (zones.js) en praat met de 3D-laag
   uitsluitend via zone-id's. Kent geen meshnamen of modeldetails: een ander
   GLB vergt hier géén wijziging.
   ═══════════════════════════════════════════════════════════════════════════ */

import { createGloveViewer } from './scene3d.js';
import { COLORS, ZONES, hexOf, defaultColors, defaultArtworkTransform } from './zones.js';

const STORE_KEY = 'fm-glove-3d-config-v3'; // v3: vereenvoudigd naar 3 zones

const state = {
  colors: defaultColors(),
  artworkTransform: defaultArtworkTransform(),  // alleen voor de 'full'-zone
  wristText: '',
};

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!saved) return;
    ZONES.forEach((z) => {
      const c = saved.colors?.[z.id];
      if (typeof c === 'string' && COLORS.some((x) => x.name === c)) state.colors[z.id] = c;
    });
    if (saved.artworkTransform) state.artworkTransform = { ...state.artworkTransform, ...saved.artworkTransform };
    if (typeof saved.wristText === 'string') state.wristText = saved.wristText.slice(0, 14);
  } catch (e) { /* corrupte opslag negeren */ }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

/* ── DOM ──────────────────────────────────────────────────────────────── */
const canvas       = document.getElementById('glove-canvas');
const stageLoading = document.getElementById('stage-loading');
const stageError   = document.getElementById('stage-error');
const partsWrap    = document.getElementById('parts');

const viewer = createGloveViewer(canvas);

/** Integratiehaak voor de omliggende pagina (cart, thumbnails, React later). */
window.FMConfigurator = {
  viewer,
  getConfiguration: () => ({
    modelProfile: viewer.profile.id,
    colors: { ...state.colors },
    artworkTransform: { ...state.artworkTransform },
    wristText: state.wristText,
  }),
  renderNow: () => viewer.renderNow(),
};

const FULL_ZONE  = ZONES.find((z) => z.artwork === 'full');
const BADGE_ZONE = ZONES.find((z) => z.artwork === 'badge');

function applyZone(zone) {
  if (!viewer.isZoneSupported(zone.id)) return;
  viewer.setZoneColor(zone.id, hexOf(state.colors[zone.id]));
}
const applyAll = () => ZONES.forEach(applyZone);

viewer.ready.then(() => {
  stageLoading.classList.add('is-hidden');
  buildUI();
  applyAll();
  if (BADGE_ZONE && state.wristText) {
    viewer.setZoneBadge(BADGE_ZONE.id, { text: state.wristText, textColor: '#FFFFFF' });
  }
}).catch((err) => {
  console.error('[3D] laden mislukt:', err);
  stageLoading.classList.add('is-hidden');
  stageError.hidden = false;
  stageError.textContent =
    'Het 3D-model kon niet geladen worden. Open deze pagina via een webserver — ' +
    'direct openen vanaf je schijf blokkeert het laden van de GLB en de modules.';
});

/* ── Bouwstenen ───────────────────────────────────────────────────────── */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function swatchGrid(zone, onPick) {
  const grid = el('div', 'swatches');
  COLORS.forEach((c) => {
    const sw = el('button', 'swatch' + (state.colors[zone.id] === c.name ? ' is-selected' : ''));
    sw.type = 'button';
    sw.style.background = c.hex;
    sw.title = c.name;
    sw.setAttribute('aria-label', `${zone.label}: ${c.name}`);
    sw.addEventListener('click', () => {
      state.colors[zone.id] = c.name;
      grid.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-selected'));
      sw.classList.add('is-selected');
      onPick(c);
      applyZone(zone);
      save();
    });
    grid.appendChild(sw);
  });
  return grid;
}

/** Schuifregelaar voor één eigenschap van de afbeelding-transformatie. */
function slider(label, key, min, max, step, fmt) {
  const row = el('div', 'ctrl-row');
  const lab = el('label', 'ctrl-label', label);
  const val = el('span', 'ctrl-value', fmt(state.artworkTransform[key]));
  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'ctrl-range';
  input.min = min; input.max = max; input.step = step;
  input.value = state.artworkTransform[key];
  input.addEventListener('input', () => {
    state.artworkTransform[key] = parseFloat(input.value);
    val.textContent = fmt(state.artworkTransform[key]);
    if (FULL_ZONE) viewer.setZoneArtworkTransform(FULL_ZONE.id, state.artworkTransform);
    save();
  });
  const head = el('div', 'ctrl-head');
  head.append(lab, val);
  row.append(head, input);
  return { row, input, val };
}

function buildUI() {
  partsWrap.innerHTML = '';

  ZONES.forEach((zone, index) => {
    const supported = viewer.isZoneSupported(zone.id);
    const row = el('div', 'part' + (supported ? '' : ' is-unsupported'));

    const head = el('button', 'part-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', 'false');
    if (!supported) { head.disabled = true; head.title = 'Niet beschikbaar op dit model.'; }

    const dot = el('span', 'part-dot');
    dot.style.background = hexOf(state.colors[zone.id]);
    const name = el('span', 'part-name', zone.label);
    const value = el('span', 'part-value', supported ? state.colors[zone.id] : '—');
    const caret = el('span', 'part-caret');
    head.append(dot, name, value, caret);

    const body = el('div', 'part-body');
    if (zone.hint) body.appendChild(el('p', 'part-hint', zone.hint));

    body.appendChild(swatchGrid(zone, (c) => {
      dot.style.background = c.hex;
      value.textContent = c.name;
    }));

    // ── Afbeelding over de hele zone (Front Panel) ──────────────────────
    if (zone.artwork === 'full') {
      body.appendChild(el('div', 'ctrl-divider'));
      body.appendChild(el('span', 'field-label', 'Afbeelding'));
      body.appendChild(el('p', 'part-hint',
        'De afbeelding wordt over het volledige paneel gelegd, inclusief de duim.'));

      const label = el('label', 'cz-upload');
      const txt = el('span', null, 'Kies een afbeelding');
      const file = document.createElement('input');
      file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
      label.append(txt, file);
      body.appendChild(label);

      const tools = el('div', 'artwork-tools');
      tools.hidden = true;
      const sx = slider('Horizontaal', 'x', -0.5, 0.5, 0.01, (v) => `${Math.round(v * 200)}%`);
      const sy = slider('Verticaal', 'y', -0.5, 0.5, 0.01, (v) => `${Math.round(v * 200)}%`);
      const ss = slider('Grootte', 'scale', 0.2, 3, 0.01, (v) => `${Math.round(v * 100)}%`);
      const sr = slider('Rotatie', 'rotation', -180, 180, 1, (v) => `${Math.round(v)}°`);
      const clear = el('button', 'ghost-btn', 'Afbeelding verwijderen');
      clear.type = 'button';
      tools.append(sx.row, sy.row, ss.row, sr.row, clear);
      body.appendChild(tools);

      file.addEventListener('change', () => {
        const f = file.files?.[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        const img = new Image();
        img.onload = () => {
          // Nieuwe upload begint neutraal: regelaars terug naar hun nulstand.
          state.artworkTransform = defaultArtworkTransform();
          sx.input.value = 0; sy.input.value = 0; ss.input.value = 1; sr.input.value = 0;
          sx.val.textContent = '0%'; sy.val.textContent = '0%';
          ss.val.textContent = '100%'; sr.val.textContent = '0°';
          viewer.setZoneArtwork(zone.id, img, state.artworkTransform);
          txt.textContent = f.name;
          tools.hidden = false;
          URL.revokeObjectURL(url);
          save();
        };
        img.onerror = () => { txt.textContent = 'Upload mislukt — probeer een andere afbeelding.'; };
        img.src = url;
      });

      clear.addEventListener('click', () => {
        viewer.setZoneArtwork(zone.id, null);
        txt.textContent = 'Kies een afbeelding';
        file.value = '';
        tools.hidden = true;
        save();
      });
    }

    // ── Logo + tekst binnen de zone (Wrist) ────────────────────────────
    if (zone.artwork === 'badge') {
      body.appendChild(el('div', 'ctrl-divider'));
      body.appendChild(el('span', 'field-label', 'Logo'));

      const label = el('label', 'cz-upload');
      const txt = el('span', null, 'Kies een logo');
      const file = document.createElement('input');
      file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
      label.append(txt, file);
      body.appendChild(label);

      file.addEventListener('change', () => {
        const f = file.files?.[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        const img = new Image();
        img.onload = () => {
          viewer.setZoneBadge(zone.id, { img });
          txt.textContent = f.name;
          URL.revokeObjectURL(url);
        };
        img.onerror = () => { txt.textContent = 'Upload mislukt — probeer een andere afbeelding.'; };
        img.src = url;
      });

      body.appendChild(el('span', 'field-label', 'Tekst'));
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'text-input';
      input.maxLength = 14;
      input.placeholder = 'JOUW NAAM';
      input.value = state.wristText;
      input.autocomplete = 'off';
      input.addEventListener('input', () => {
        state.wristText = input.value.slice(0, 14);
        viewer.setZoneBadge(zone.id, { text: state.wristText, textColor: '#FFFFFF' });
        save();
      });
      body.appendChild(input);
      body.appendChild(el('p', 'part-hint', 'Max. 14 tekens — verschijnt op de manchet.'));
    }

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

/* ── Camera-presets ───────────────────────────────────────────────────── */
document.querySelectorAll('.view-btn[data-cam]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn[data-cam]').forEach((b) => {
      b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true');
    viewer.goToPreset(btn.getAttribute('data-cam'));
  });
});
document.getElementById('cam-reset')?.addEventListener('click', () => {
  const first = viewer.cameraPresetNames[0];
  document.querySelectorAll('.view-btn[data-cam]').forEach((b) => {
    const on = b.getAttribute('data-cam') === first;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  viewer.goToPreset(first);
});

/* ── Reset ────────────────────────────────────────────────────────────── */
document.getElementById('reset').addEventListener('click', () => {
  state.colors = defaultColors();
  state.artworkTransform = defaultArtworkTransform();
  state.wristText = '';
  if (FULL_ZONE) viewer.setZoneArtwork(FULL_ZONE.id, null);
  if (BADGE_ZONE) viewer.setZoneBadge(BADGE_ZONE.id, { img: null, text: '' });
  buildUI();
  applyAll();
  save();
});

/* ── Start ────────────────────────────────────────────────────────────── */
load();
