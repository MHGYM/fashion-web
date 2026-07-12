const db = require('../db')
const mollie = require('../services/mollie')
const email = require('../services/email')

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

/** Stuurt orderbevestiging + schoolnotificatie na een geslaagde betaling (fire-and-forget). */
async function sendPaidEmails(orderId) {
  try {
    const oR = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] })
    const order = oR.rows[0]
    if (!order) return
    const items = (await db.execute({ sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [orderId] })).rows
    await email.orderConfirmation(order, items)

    if (order.school_id) {
      const sR = await db.execute({ sql: 'SELECT * FROM schools WHERE id = ?', args: [order.school_id] })
      const school = sR.rows[0]
      if (school) {
        const admins = (await db.execute({
          sql: `SELECT email FROM users WHERE role = 'school' AND school_id = ?`, args: [school.id]
        })).rows.map(u => u.email)
        await email.schoolOrderNotification([school.contact_email, ...admins], school, order)
      }
    }
  } catch (e) { console.error('[MAIL] order-mails mislukt:', e.message) }
}

/** Voorraad terugboeken bij mislukte/verlopen betaling */
async function restock(orderId) {
  const items = await db.execute({ sql: 'SELECT variant_id, quantity FROM order_items WHERE order_id = ?', args: [orderId] })
  for (const item of items.rows) {
    await db.execute({ sql: 'UPDATE product_variants SET stock = stock + ? WHERE id = ?', args: [item.quantity, item.variant_id] })
  }
}

/** Gedeelde afhandeling van een definitieve betaalstatus */
async function settleOrder(order, molliePaidStatus) {
  if (order.paid_at || order.status === 'cancelled') return // al afgehandeld

  if (molliePaidStatus === 'paid') {
    await db.execute({
      sql: `UPDATE orders SET status = 'pending', paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      args: [order.id]
    })
    if (order.discount_code) {
      await db.execute({
        sql: 'UPDATE discount_codes SET times_used = times_used + 1 WHERE UPPER(code) = ?',
        args: [order.discount_code.toUpperCase()]
      })
    }
    // Bevestiging naar klant + notificatie naar de school (async, blokkeert de betaling niet)
    sendPaidEmails(order.id).catch(() => {})
  } else if (['canceled', 'expired', 'failed'].includes(molliePaidStatus)) {
    await db.execute({
      sql: `UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
      args: [order.id]
    })
    await restock(order.id)
  }
  // 'open' / 'pending' bij Mollie: nog niets doen
}

/**
 * Mollie webhook. Mollie POST form-encoded: id=tr_xxx
 * Altijd 200 teruggeven zodat Mollie niet blijft retryen op logica-fouten.
 */
const webhook = wrap(async (req, res) => {
  const paymentId = req.body?.id
  if (!paymentId) return res.status(400).send('missing id')

  const payment = await mollie.getPayment(paymentId)
  if (!payment) return res.status(200).send('ok') // mock of onbekend

  const orderId = payment.metadata?.order_id
  if (orderId) {
    const r = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] })
    if (r.rows[0]) await settleOrder(r.rows[0], payment.status)
  }
  res.status(200).send('ok')
})

/**
 * Betaalstatus van een order (voor de retourpagina).
 * Synct actief met Mollie als er nog geen webhook is binnengekomen —
 * zo werkt een echte testsleutel ook lokaal zonder publieke webhook-URL.
 */
const orderPaymentStatus = wrap(async (req, res) => {
  const r = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ? AND user_id = ?', args: [req.params.orderId, req.user.id] })
  const order = r.rows[0]
  if (!order) return res.status(404).json({ error: 'Bestelling niet gevonden.' })

  if (!order.paid_at && order.status === 'awaiting_payment' && order.payment_id && !order.payment_id.startsWith('mock_')) {
    try {
      const payment = await mollie.getPayment(order.payment_id)
      if (payment) {
        await settleOrder(order, payment.status)
        const r2 = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [order.id] })
        return res.json({ status: r2.rows[0].status, paid: !!r2.rows[0].paid_at, total: r2.rows[0].total })
      }
    } catch (_) { /* Mollie tijdelijk onbereikbaar: huidige status teruggeven */ }
  }
  res.json({ status: order.status, paid: !!order.paid_at, total: order.total })
})

/**
 * Mock-betaling afronden (alleen actief zonder echte Mollie-sleutel).
 * body: { outcome: 'paid' | 'failed' }
 */
const completeMockPayment = wrap(async (req, res) => {
  if (mollie.isLive()) return res.status(403).json({ error: 'Mock-betalingen zijn uitgeschakeld.' })

  const { paymentId } = req.params
  const outcome = req.body.outcome === 'paid' ? 'paid' : 'failed'

  const r = await db.execute({ sql: 'SELECT * FROM orders WHERE payment_id = ?', args: [paymentId] })
  const order = r.rows[0]
  if (!order) return res.status(404).json({ error: 'Betaling niet gevonden.' })

  await settleOrder(order, outcome)
  res.json({ order_id: order.id, status: outcome === 'paid' ? 'pending' : 'cancelled' })
})

/** Publieke info voor de mock-betaalpagina */
const mockPaymentInfo = wrap(async (req, res) => {
  if (mollie.isLive()) return res.status(403).json({ error: 'Mock-betalingen zijn uitgeschakeld.' })
  const r = await db.execute({
    sql: 'SELECT id, total, status, paid_at FROM orders WHERE payment_id = ?',
    args: [req.params.paymentId]
  })
  const order = r.rows[0]
  if (!order) return res.status(404).json({ error: 'Betaling niet gevonden.' })
  res.json({ order_id: order.id, amount: order.total, settled: !!order.paid_at || order.status === 'cancelled' })
})

module.exports = { webhook, orderPaymentStatus, completeMockPayment, mockPaymentInfo }
