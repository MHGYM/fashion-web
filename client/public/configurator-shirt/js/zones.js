/* ═══════════════════════════════════════════════════════════════════════════
   T-SHIRT-PRODUCTDEFINITIE
   ═══════════════════════════════════════════════════════════════════════════
   Zelfde patroon als client/public/configurator/js/zones.js (bokshandschoen),
   maar dan voor het T-shirt. COLORS/NAME_FONTS/NAME_SIZES worden bewust
   hergebruikt uit de bokshandschoen-configurator (geïmporteerd, niet
   gekopieerd) — één bron van waarheid voor het kleurenpalet en lettertypes,
   zonder de bokshandschoen-bestanden aan te raken.

   Belangrijk verschil met de handschoen: die heeft 9 los kleurbare zones
   (front-panel, palm, duim, ...). Het shirt heeft er maar ÉÉN — "Shirt" —
   die het VOLLEDIGE model dekt (voorkant, achterkant, beide mouwen,
   schouders). Dat is precies wat gevraagd is: één kleurkeuze die overal
   naadloos doorloopt, geen los kleurbare mouwen die kunnen achterblijven.
   ═══════════════════════════════════════════════════════════════════════════ */

export { COLORS, hexOf, NAME_FONTS, NAME_SIZES } from '../../configurator/js/zones.js';

/** Maten waarin het shirt te bestellen is (moet matchen met de backend). */
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

/**
 * Prijsopbouw — zelfde model als de bokshandschoen-configurator (zie
 * client/public/configurator/js/zones.js PRICING): base + eenmalige
 * toeslag voor "eigen logo/ontwerp" + eenmalige toeslag voor naam. De
 * server rekent bij het toevoegen aan de winkelwagen de definitieve prijs
 * opnieuw uit (zie CUSTOM_JERSEY_PRICING in src/controllers/
 * customizerController.js — moet hier exact gelijk aan blijven); dit is
 * alleen voor de weergave in de UI.
 */
export const PRICING = {
  base: 25.95,
  customLogo: 12.95,  // eigen logo/ontwerp op de voorkant
  name: 10.00,         // naam toevoegen
};

export function defaultArtworkTransform() {
  return { x: 0, y: 0, scale: 1, rotation: 0 };
}
