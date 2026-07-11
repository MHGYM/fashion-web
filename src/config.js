/**
 * Centrale configuratie — alle omgevingsafhankelijke waarden en
 * business-constanten op één plek.
 */

/** Publieke site-URL (productie: https://fightmarketing.nl) */
const APP_URL = (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/$/, '')

/** Publieke API-URL voor Mollie-webhooks (géén localhost — Mollie weigert dat) */
const BASE_URL = (process.env.BASE_URL || '').trim().replace(/\/$/, '')

// ── Business-constanten ───────────────────────────────────────────────────────
const BTW_PCT                  = 0.21   // Nederlands btw-tarief
const FREE_SHIPPING_THRESHOLD  = 50     // gratis verzending vanaf dit orderbedrag (na korting)
const SHIPPING_COST            = 4.95   // verzendkosten onder de drempel

module.exports = { APP_URL, BASE_URL, BTW_PCT, FREE_SHIPPING_THRESHOLD, SHIPPING_COST }
