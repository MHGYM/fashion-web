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
 *  id            — stabiele sleutel (opslag, cart-payload, model-profielen).
 *  label         — wat de klant ziet.
 *  default       — standaardkleur (naam uit COLORS).
 *  artwork       — 'full'  : afbeelding vult de héle zone (UV-breed), met
 *                            verplaatsen/schalen/roteren.
 *                  'badge' : logo + tekst als kleiner element binnen de zone.
 *                  null    : alleen kleur.
 *  artworkGroup  — alleen bij artwork:'full'. Zone-id's (incl. deze zone
 *                  zelf) die SAMEN één doorlopend ontwerp vormen wanneer
 *                  hier een afbeelding wordt geüpload — bv. het front panel
 *                  ligt niet als losse rechthoek op de handschoen, maar loopt
 *                  door over de duim. Die zones blijven wél apart kleurbaar
 *                  zolang er geen afbeelding is; de renderer projecteert de
 *                  afbeelding als één geheel over alle meshes in de groep
 *                  (vergelijkbaar met een sticker die om de vorm heen buigt,
 *                  niet los per UV-eiland). Ontbreekt dit veld, dan geldt
 *                  alleen de zone zelf.
 */
export const ZONES = [
  {
    id: 'front-panel', label: 'Front Panel', group: 'Panelen',
    default: 'Black', artwork: 'full',
    artworkGroup: ['front-panel', 'outer-thumb', 'inner-thumb', 'thumb-strip'],
    hint: 'Het slagvlak inclusief de volledige duim. Een upload wordt als één doorlopend ontwerp over paneel én duim geplaatst.',
  },
  {
    id: 'palm', label: 'Palm', group: 'Panelen',
    default: 'Black', artwork: null,
    hint: 'De complete palmzijde.',
  },
  {
    id: 'outer-thumb', label: 'Outer Thumb', group: 'Duim',
    default: 'Black', artwork: null,
    hint: 'Buitenzijde van de duim. Kleur zichtbaar zolang er geen afbeelding op het Front Panel staat.',
  },
  {
    id: 'inner-thumb', label: 'Inner Thumb', group: 'Duim',
    default: 'Black', artwork: null,
    hint: 'Binnenzijde van de duim. Kleur zichtbaar zolang er geen afbeelding op het Front Panel staat.',
  },
  {
    // Naad tussen duim en palm — apart mesh, aangewezen door een klant die
    // hem niet kon herkleuren (zat destijds samengevoegd in de statische
    // voering). Alleen Lace-Up heeft deze als losse geometrie; op Velcro
    // n.v.t. (zie models/velcro.js).
    id: 'thumb-strip', label: 'Thumb Strip', group: 'Duim',
    default: 'Black', artwork: null,
    hint: 'De naad tussen duim en palm. Kleur zichtbaar zolang er geen afbeelding op het Front Panel staat.',
  },
  {
    id: 'wrist', label: 'Wrist', group: 'Sluiting',
    default: 'Black', artwork: 'badge',
    hint: 'Manchet. Plaats hier je logo en naam.',
  },
  {
    id: 'laces', label: 'Laces', group: 'Sluiting',
    default: 'White', artwork: null,
    hint: 'De veters. Alleen bij het lace-up model.',
  },
  {
    id: 'piping', label: 'Piping', group: 'Details',
    default: 'Gold', artwork: null,
    hint: 'De bies langs de naden.',
  },
  {
    id: 'stitching', label: 'Stitching', group: 'Details',
    default: 'White', artwork: null,
    hint: 'Het stikwerk.',
  },
];

/** Groepen in weergavevolgorde, afgeleid uit ZONES (geen dubbele lijst). */
export const ZONE_GROUPS = ZONES.reduce((a, z) => (a.includes(z.group) ? a : [...a, z.group]), []);

export const ZONE_IDS = ZONES.map((z) => z.id);
export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));

/** Maten waarin de handschoen te bestellen is (moet matchen met de backend). */
export const SIZES = ['8oz', '10oz', '12oz', '14oz', '16oz'];

/**
 * Prijsopbouw. De server rekent bij het toevoegen aan de winkelwagen de
 * definitieve prijs opnieuw uit — dit is voor de weergave in de UI.
 */
export const PRICING = {
  base: 69.95,
  customImage: 20.00,   // eigen afbeelding op het front panel
  wristName: 10.00,     // naam op de manchet
  wristLogo: 15.00,     // eigen logo op de manchet
};

/** Lettertypes voor de naam op de manchet. */
export const NAME_FONTS = [
  { id: 'inter',  label: 'Inter Black',  css: '900 {size}px Inter, system-ui, sans-serif' },
  { id: 'bebas',  label: 'Bebas Neue',   css: '400 {size}px "Bebas Neue", Impact, sans-serif' },
  { id: 'oswald', label: 'Oswald',       css: '600 {size}px Oswald, "Arial Narrow", sans-serif' },
];

/** Relatieve tekstgroottes (vermenigvuldiger op de basisgrootte). */
export const NAME_SIZES = [
  { id: 'xs', label: 'A', scale: 0.72 },
  { id: 's',  label: 'A', scale: 0.86 },
  { id: 'm',  label: 'A', scale: 1.00 },
  { id: 'l',  label: 'A', scale: 1.18 },
  { id: 'xl', label: 'A', scale: 1.36 },
];

/** Standaardconfiguratie: { 'front-panel': 'Black', ... } */
export function defaultColors() {
  return Object.fromEntries(ZONES.map((z) => [z.id, z.default]));
}

/** Neutrale begintoestand voor een afbeelding op een zone. */
export function defaultArtworkTransform() {
  return { x: 0, y: 0, scale: 1, rotation: 0 };
}
