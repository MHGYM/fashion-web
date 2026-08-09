/* ═══════════════════════════════════════════════════════════════════════════
   MODELREGISTER — welke handschoenmodellen kan de klant kiezen?
   ═══════════════════════════════════════════════════════════════════════════
   Een model toevoegen:
     1. Zet het .glb in assets/
     2. Maak een profiel in models/ (kopieer er een als basis)
     3. Voeg het hieronder toe aan MODELS

   Verder verandert er niets: zones.js beschrijft het product, scene3d.js
   rendert generiek en de UI bouwt zichzelf op uit dit register.
   ═══════════════════════════════════════════════════════════════════════════ */

import velcro from './models/velcro.js';
import laceup from './models/laceup.js';
import { ZONE_IDS } from './zones.js';

/**
 * Vult ontbrekende zones aan als 'unsupported' zodat een vergeten binding
 * meteen zichtbaar is in de console i.p.v. stilzwijgend niets te doen.
 */
function validate(p) {
  const missing = ZONE_IDS.filter((id) => !p.bindings[id]);
  if (missing.length) {
    console.warn(
      `[model-profile] Profiel "${p.id}" mist een binding voor: ${missing.join(', ')}. ` +
      'Deze zones worden als niet-beschikbaar getoond.',
    );
    missing.forEach((id) => {
      p.bindings[id] = { type: 'unsupported', reason: 'Niet gedefinieerd in het model-profiel.' };
    });
  }
  const unknown = Object.keys(p.bindings).filter((id) => !ZONE_IDS.includes(id));
  if (unknown.length) {
    console.warn(`[model-profile] Profiel "${p.id}" bevat onbekende zone-id's: ${unknown.join(', ')}.`);
  }
  return p;
}

export const MODELS = [velcro, laceup].map(validate);
export const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m]));
export const DEFAULT_MODEL_ID = MODELS[0].id;

export default MODELS[0];
