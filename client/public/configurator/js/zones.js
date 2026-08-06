/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTDEFINITIE — welke onderdelen heeft een FightMarketing-handschoen?
   ═══════════════════════════════════════════════════════════════════════════
   Bewust MODEL-ONAFHANKELIJK: hier staat wat de klant kan aanpassen, niet hoe
   een specifiek 3D-bestand dat levert. Een ander GLB betekent alleen een nieuw
   model-profiel (models/*.js) — dit bestand en de UI blijven ongewijzigd.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Het 16-kleurenpalet. Eén bron van waarheid voor UI én 3D. */
export const COLORS = [
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

export function hexOf(colorName) {
  return (COLORS.find((c) => c.name === colorName) || COLORS[0]).hex;
}

/**
 * De kleurbare onderdelen, in UI-volgorde.
 *
 *  id       — stabiele sleutel (opslag, cart-payload, model-profielen).
 *  label    — wat de klant ziet.
 *  default  — standaardkleur (naam uit COLORS).
 *  artwork  — 'full'  : afbeelding vult de héle zone (UV-breed), met
 *                       verplaatsen/schalen/roteren.
 *             'badge' : logo + tekst als kleiner element binnen de zone.
 *             null    : alleen kleur.
 */
export const ZONES = [
  {
    id: 'front-panel',
    label: 'Front Panel',
    default: 'Black',
    artwork: 'full',
    hint: 'Inclusief de volledige duim en de piping rondom.',
  },
  {
    id: 'palm',
    label: 'Palm',
    default: 'Black',
    artwork: null,
    hint: 'De complete palmzijde.',
  },
  {
    id: 'wrist',
    label: 'Wrist',
    default: 'Black',
    artwork: 'badge',
    hint: 'Manchet inclusief strap. Plaats hier je logo en naam.',
  },
];

export const ZONE_IDS = ZONES.map((z) => z.id);
export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));

/** Standaardconfiguratie: { 'front-panel': 'Black', ... } */
export function defaultColors() {
  return Object.fromEntries(ZONES.map((z) => [z.id, z.default]));
}

/** Neutrale begintoestand voor een afbeelding op een zone. */
export function defaultArtworkTransform() {
  return { x: 0, y: 0, scale: 1, rotation: 0 };
}
