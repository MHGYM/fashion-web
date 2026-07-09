/**
 * Mollie betaalservice (API v2).
 * Zonder MOLLIE_API_KEY in .env draait alles in MOCK-modus:
 * betalingen worden gesimuleerd via een interne betaalpagina, zodat de
 * volledige flow lokaal testbaar is. Met een echte (test_)sleutel gaat
 * alles via Mollie, incl. iDEAL.
 */
const MOLLIE_API = 'https://api.mollie.com/v2'

const apiKey   = () => (process.env.MOLLIE_API_KEY || '').trim()
const isLive   = () => !!apiKey()

async function mollieFetch(path, options = {}) {
  const r = await fetch(`${MOLLIE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const err = new Error(data.detail || data.title || `Mollie fout (${r.status})`)
    err.status = 502
    throw err
  }
  return data
}

/**
 * Maakt een betaling aan. Retourneert { id, checkoutUrl, mock }.
 */
async function createPayment({ amount, description, redirectUrl, orderId }) {
  if (!isLive()) {
    const id = 'mock_' + orderId + '_' + Math.random().toString(36).slice(2, 8)
    return { id, checkoutUrl: `/betalen/mock/${id}?order=${orderId}`, mock: true }
  }

  const body = {
    amount:      { currency: 'EUR', value: Number(amount).toFixed(2) },
    description,
    redirectUrl,
    metadata:    { order_id: orderId },
  }
  // Webhook alleen meesturen als BASE_URL publiek bereikbaar is (Mollie weigert localhost)
  const base = (process.env.BASE_URL || '').trim()
  if (base && !/localhost|127\.0\.0\.1/.test(base)) {
    body.webhookUrl = `${base.replace(/\/$/, '')}/api/payments/webhook`
  }

  const p = await mollieFetch('/payments', { method: 'POST', body: JSON.stringify(body) })
  return { id: p.id, checkoutUrl: p._links.checkout.href, mock: false }
}

/** Haalt de actuele betaalstatus op bij Mollie. Retourneert null in mock-modus. */
async function getPayment(paymentId) {
  if (!isLive() || paymentId.startsWith('mock_')) return null
  return mollieFetch(`/payments/${paymentId}`)
}

module.exports = { createPayment, getPayment, isLive }
