/* ═══════════════════════════════════════════════════════════════════════════
   FightMarketing — Glove Configurator (UI-laag)
   ═══════════════════════════════════════════════════════════════════════════
   Bouwt zichzelf volledig op uit de productdefinitie (zones.js). Kent geen
   meshnamen, geen decals, geen modeldetails — dat zit allemaal achter de
   viewer-API. Een nieuw 3D-model vergt hier dus géén wijziging.
   ═══════════════════════════════════════════════════════════════════════════ */

import { createGloveViewer } from './scene3d.js';
import { COLORS, ZONES, ZONE_GROUPS, hexOf, defaultColors } from './zones.js';

const STORE_KEY = 'fm-glove-3d-config-v2'; // v2: 14 zones (Strap toegevoegd)

const state = { colors: defaultColors(), name: '' };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!saved) return;
    ZONES.forEach((z) => {
      const c = saved.colors?.[z.id];
      if (typeof c === 'string' && COLORS.some((x) => x.name === c)) state.colors[z.id] = c;
    });
    if (typeof saved.name === 'string') state.name = saved.name.slice(0, 12);
  } catch (e) { /* corrupte opslag negeren */ }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

/* ── DOM ──────────────────────────────────────────────────────────────── */
const canvas         = document.getElementById('glove-canvas');
const stageLoading   = document.getElementById('stage-loading');
const stageError     = document.getElementById('stage-error');
const partsWrap      = document.getElementById('parts');
const nameInput      = document.getElementById('name-input');
const resetBtn       = document.getElementById('reset');
const logoFileInput  = document.getElementById('logo-file');
const logoUploadText = document.getElementById('logo-upload-text');

const viewer = createGloveViewer(canvas);

/**
 * Publieke integratiehaak. De omliggende pagina (of straks de React-app en de
 * cart-koppeling) kan hiermee de huidige configuratie uitlezen of een render
 * forceren, zonder de interne modules te hoeven importeren.
 */
window.FMConfigurator = {
  viewer,
  getConfiguration: () => ({
    modelProfile: viewer.profile.id,
    colors: { ...state.colors },
    name: state.name,
  }),
  renderNow: () => viewer.renderNow(),
};

/* ── Kleur/tekst/artwork doorgeven aan de 3D-laag ─────────────────────── */
function applyZone(zone) {
  if (!viewer.isZoneSupported(zone.id)) return;
  const hex = hexOf(state.colors[zone.id]);
  if (zone.content === 'text') viewer.setZoneText(zone.id, state.name, hex);
  else viewer.setZoneColor(zone.id, hex);
}
const applyAll = () => ZONES.forEach(applyZone);

viewer.ready.then(() => {
  stageLoading.classList.add('is-hidden');
  buildParts();          // pas bouwen als bekend is wat het model ondersteunt
  nameInput.value = state.name;
  applyAll();
}).catch((err) => {
  console.error('[3D] laden mislukt:', err);
  stageLoading.classList.add('is-hidden');
  stageError.hidden = false;
  stageError.textContent =
    'Het 3D-model kon niet geladen worden. Open deze pagina via een webserver — ' +
    'direct openen vanaf je schijf blokkeert het laden van de GLB en de modules.';
});

/* ── Kleurkiezer opbouwen uit de zone-catalogus ───────────────────────── */
function buildParts() {
  partsWrap.innerHTML = '';

  ZONE_GROUPS.forEach((groupName) => {
    const zonesInGroup = ZONES.filter((z) => z.group === groupName);
    if (!zonesInGroup.length) return;

    const heading = document.createElement('div');
    heading.className = 'part-group';
    heading.textContent = groupName;
    partsWrap.appendChild(heading);

    zonesInGroup.forEach((zone) => {
      const support = viewer.getZoneSupport(zone.id);
      const row = document.createElement('div');
      row.className = 'part' + (support.supported ? '' : ' is-unsupported');

      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'part-head';
      head.setAttribute('aria-expanded', 'false');
      if (!support.supported) {
        head.disabled = true;
        head.title = support.reason || 'Niet beschikbaar op dit model.';
      }

      const dot = document.createElement('span');
      dot.className = 'part-dot';
      dot.style.background = hexOf(state.colors[zone.id]);

      const label = document.createElement('span');
      label.className = 'part-name';
      label.textContent = zone.label;
      if (!support.supported) {
        const tag = document.createElement('span');
        tag.className = 'part-tag';
        tag.textContent = 'n.v.t.';
        label.appendChild(tag);
      } else if (support.type === 'decal') {
        const tag = document.createElement('span');
        tag.className = 'part-tag';
        tag.textContent = 'decal';
        tag.title = 'Geprojecteerd — dit model heeft hiervoor geen eigen geometrie.';
        label.appendChild(tag);
      }

      const value = document.createElement('span');
      value.className = 'part-value';
      value.textContent = support.supported ? state.colors[zone.id] : '—';

      const caret = document.createElement('span');
      caret.className = 'part-caret';

      head.append(dot, label, value, caret);

      const body = document.createElement('div');
      body.className = 'part-body';
      const grid = document.createElement('div');
      grid.className = 'swatches';

      COLORS.forEach((c) => {
        const sw = document.createElement('button');
        sw.type = 'button';
        sw.className = 'swatch' + (state.colors[zone.id] === c.name ? ' is-selected' : '');
        sw.style.background = c.hex;
        sw.title = c.name;
        sw.setAttribute('aria-label', `${zone.label}: ${c.name}`);
        sw.addEventListener('click', () => {
          state.colors[zone.id] = c.name;
          grid.querySelectorAll('.swatch').forEach((s) => s.classList.remove('is-selected'));
          sw.classList.add('is-selected');
          dot.style.background = c.hex;
          value.textContent = c.name;
          applyZone(zone);
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
    });
  });
}

/* ── Naam ─────────────────────────────────────────────────────────────── */
const nameZone = ZONES.find((z) => z.content === 'text');
nameInput.addEventListener('input', () => {
  state.name = nameInput.value.slice(0, 12);
  if (nameZone) applyZone(nameZone);
  save();
});

/* ── Logo-upload ──────────────────────────────────────────────────────── */
const artworkZone = ZONES.find((z) => z.content === 'artwork');
logoFileInput.addEventListener('change', () => {
  const file = logoFileInput.files?.[0];
  if (!file || !artworkZone) return;
  if (!viewer.isZoneSupported(artworkZone.id)) {
    logoUploadText.textContent = 'Niet beschikbaar op dit model.';
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    viewer.setZoneImage(artworkZone.id, img, hexOf(state.colors[artworkZone.id]));
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
resetBtn.addEventListener('click', () => {
  state.colors = defaultColors();
  state.name = '';
  nameInput.value = '';
  logoUploadText.textContent = 'Kies een afbeelding';
  if (artworkZone) viewer.setZoneImage(artworkZone.id, null, hexOf(state.colors[artworkZone.id]));
  buildParts();
  applyAll();
  save();
});

/* ── Start ────────────────────────────────────────────────────────────── */
load();
