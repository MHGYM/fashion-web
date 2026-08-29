/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTDEFINITIE — welke onderdelen heeft een FightMarketing-scheenbeschermer?
   ═══════════════════════════════════════════════════════════════════════════
   Zelfde patroon als client/public/configurator/js/zones.js (bokshandschoen):
   dit bestand beschrijft het PRODUCT (zones, maten, prijzen), niet hoe het
   3D-model dat technisch levert — dat staat in js/models/shinguard.js.
   COLORS/hexOf worden bewust hergebruikt uit de bokshandschoen-configurator
   (geïmporteerd, niet gekopieerd) — één bron van waarheid voor het
   kleurenpalet, zonder de bokshandschoen-bestanden aan te raken.

   Bron: "Protector.glb", aangeleverd door de klant. Geanalyseerd met
   geïsoleerde Blender-renders per mesh (niet alleen op de node-namen
   vertrouwd — zie js/models/shinguard.js voor de volledige toelichting).
   Zes zones, elk direct overeenkomend met de daadwerkelijke geometrie:
     - main-front / main-back: de twee scheen-schaal-helften (voorkant is
       het bolle, beschermende deel; achterkant de kuit-zijde met straps).
     - piping: de rand-bies rondom.
     - straps: de vier band-onderdelen (boven/onder, buiten/binnen) samen —
       één kleurkeuze voor de hele sluiting, net als "Straps" in de opdracht.
     - front-foot: het voorste voetgedeelte onderaan (Foot_Front-mesh).
     - stitching: het zichtbare stiksel.
   Velcro (voorheen een 'mesh-multi'-zone over Velcro_1..4) is op verzoek
   verwijderd: niet meer als tab/kleurkeuze getoond. De meshes zelf blijven
   gewoon in het GLB en in de scene (nu net als de resterende staticNodes op
   hun vaste, bij het laden toegepaste kleur) — alleen niet meer klant-
   bewerkbaar.
   Foot_Back/Elastic_foot/Elastic_heel zijn geen aparte kleurzone — bewust
   net als 'lining' bij de handschoen: vast, niet-klantbewerkbaar onderdeel
   (zie staticNodes in shinguard.js), simpelweg omdat dit niet gevraagd is.
   ═══════════════════════════════════════════════════════════════════════════ */

export { COLORS, hexOf } from '../../configurator/js/zones.js';

export const ZONES = [
  {
    id: 'main-front', label: 'Main Front', group: 'Panelen',
    default: 'Black', artwork: 'full',
    artworkGroup: ['main-front'],
    hint: 'De voorkant/scheenzijde. Hier komt ook je eigen logo op te staan.',
  },
  {
    id: 'main-back', label: 'Main Back', group: 'Panelen',
    default: 'Black', artwork: null,
    hint: 'De achterkant/kuitzijde.',
  },
  {
    id: 'piping', label: 'Piping', group: 'Details',
    default: 'Gold', artwork: null,
    hint: 'De bies langs de rand.',
  },
  {
    id: 'straps', label: 'Straps', group: 'Sluiting',
    default: 'Black', artwork: null,
    hint: 'De banden van de sluiting (boven en onder).',
  },
  {
    id: 'stitching', label: 'Stitching', group: 'Details',
    default: 'White', artwork: null,
    hint: 'Het zichtbare stiksel.',
  },
  {
    id: 'front-foot', label: 'Front Foot', group: 'Voet',
    default: 'Black', artwork: null,
    hint: 'Het voorste voetgedeelte, onderaan de scheenbeschermer.',
  },
];

export const ZONE_GROUPS = ZONES.reduce((a, z) => (a.includes(z.group) ? a : [...a, z.group]), []);
export const ZONE_IDS = ZONES.map((z) => z.id);
export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));

/** Maten waarin de scheenbeschermer te bestellen is (moet matchen met de backend). */
export const SIZES = ['S', 'M', 'L', 'XL'];

/**
 * Prijsopbouw — zelfde model als de bokshandschoen-configurator (zie
 * client/public/configurator/js/zones.js PRICING). Basisprijs is bewust
 * gelijk aan de bokshandschoen (129.95) — moet gelijk blijven aan
 * CUSTOM_SHINGUARD_PRICING.base in src/controllers/customizerController.js
 * EN aan de prijs van 'custom-shinguards' in de seedCustom-aanroep in
 * src/schema.js: die twee bepalen samen wat er daadwerkelijk in rekening
 * wordt gebracht, dit is alleen de weergave in de configurator zelf.
 */
export const PRICING = {
  base: 129.95,
  customLogo: 12.95,
};

export function defaultColors() {
  return Object.fromEntries(ZONES.map((z) => [z.id, z.default]));
}

/** scale 1 = de afbeelding volledig "cover"-vullend (rand-tot-rand, zie
 *  drawCoverImage in scene3d.js) — dat liet nooit iets van de eigen
 *  paneelkleur zien, ook niet nadat de decal transparant werd gemaakt. 0.45
 *  laat een geüpload logo standaard als logo verschijnen (gecentreerd,
 *  ruimte voor de kleur eromheen); de bestaande grootte-slider (0.2–3)
 *  werkt nog gewoon om het net als voorheen te vergroten of te verkleinen. */
export function defaultArtworkTransform() {
  return { x: 0, y: 0, scale: 0.45, rotation: 0 };
}
