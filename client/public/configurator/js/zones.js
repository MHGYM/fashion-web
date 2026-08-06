/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTDEFINITIE — welke onderdelen heeft een FightMarketing-handschoen?
   ═══════════════════════════════════════════════════════════════════════════
   Dit bestand is bewust MODEL-ONAFHANKELIJK. Het beschrijft het product zoals
   de klant het ziet: 14 kleurbare onderdelen, hun volgorde, labels en
   standaardkleuren. Hier staat NIETS over meshes, GLB-namen of decals.

   Wissel je later naar een professioneel UV-gemapt model, dan blijft dit
   bestand ongewijzigd — alleen het model-profiel (models/*.js) verandert.
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
 * De 14 kleurbare onderdelen, in de volgorde waarin ze in de UI verschijnen.
 *
 *  id      — stabiele sleutel; gebruikt in opslag, cart-payload en model-profielen.
 *            NOOIT hernoemen zonder migratie (staat in localStorage/bestellingen).
 *  label   — wat de klant ziet.
 *  group   — voor visuele groepering in het rechterpaneel.
 *  default — standaardkleur (naam uit COLORS).
 *  content — 'color' (alleen kleur) | 'text' (kleur + tekstinvoer)
 *            | 'artwork' (kleur + afbeelding-upload).
 */
export const ZONES = [
  { id: 'top-panel',   label: 'Top Panel',   group: 'Panels',  default: 'Black', content: 'color' },
  { id: 'front-panel', label: 'Front Panel', group: 'Panels',  default: 'Black', content: 'color' },
  { id: 'palm',        label: 'Palm',        group: 'Panels',  default: 'Black', content: 'color' },
  { id: 'back-palm',   label: 'Back Palm',   group: 'Panels',  default: 'Black', content: 'color' },
  { id: 'outer-thumb', label: 'Outer Thumb', group: 'Thumb',   default: 'Black', content: 'color' },
  { id: 'inner-thumb', label: 'Inner Thumb', group: 'Thumb',   default: 'Black', content: 'color' },
  { id: 'wrist',       label: 'Wrist',       group: 'Closure', default: 'Black', content: 'color' },
  { id: 'strap',       label: 'Strap',       group: 'Closure', default: 'Black', content: 'color' },
  { id: 'laces',       label: 'Laces',       group: 'Closure', default: 'White', content: 'color' },
  { id: 'piping',      label: 'Piping',      group: 'Details', default: 'Gold',  content: 'color' },
  { id: 'trim',        label: 'Trim',        group: 'Details', default: 'Gold',  content: 'color' },
  { id: 'stitching',   label: 'Stitching',   group: 'Details', default: 'White', content: 'color' },
  { id: 'logo',        label: 'Logo',        group: 'Branding',default: 'Gold',  content: 'artwork' },
  { id: 'name',        label: 'Naam',        group: 'Branding',default: 'White', content: 'text' },
];

export const ZONE_IDS = ZONES.map((z) => z.id);
export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));

/** Groepen in weergavevolgorde, afgeleid van ZONES (geen dubbele lijst). */
export const ZONE_GROUPS = ZONES.reduce((acc, z) => {
  if (!acc.includes(z.group)) acc.push(z.group);
  return acc;
}, []);

/** Standaardconfiguratie: { 'top-panel': 'Black', ... } */
export function defaultColors() {
  return Object.fromEntries(ZONES.map((z) => [z.id, z.default]));
}
