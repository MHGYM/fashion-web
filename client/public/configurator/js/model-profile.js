/* ═══════════════════════════════════════════════════════════════════════════
   ACTIEF MODEL — de enige schakelaar
   ═══════════════════════════════════════════════════════════════════════════
   Wil je een ander 3D-model gebruiken? Wijzig alleen de import hieronder.
   Verder verandert er niets aan de configurator.

       import profile from './models/fm-glove-pro.js';   ← huidig model
       import profile from './models/pro-uv-glove.js';   ← toekomstig model
   ═══════════════════════════════════════════════════════════════════════════ */

import profile from './models/fm-glove-pro.js';
import { ZONE_IDS } from './zones.js';

/**
 * Controleert bij het opstarten of het profiel elke productzone afhandelt.
 * Vergeet je een zone bij een nieuw model, dan zie je dat meteen in de console
 * i.p.v. dat die zone stilzwijgend niets doet.
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

export default validate(profile);
