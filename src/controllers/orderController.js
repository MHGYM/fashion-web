const db = require('../db')
const mollie = require('../services/mollie')
const { APP_URL, BTW_PCT, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } = require('../config')
const { isEmail, isStr, optStr, bad } = require('../middleware/validate')

/** Wraps async handlers so thrown errors reach Express error middleware */
const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const createOrder = wrap(async (req, res) => {
  const { shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_postal, shipping_country, notes,
          school_slug, discount_code } = req.body

  if (!isStr(shipping_name, 120) || !isStr(shipping_address, 200) || !isStr(shipping_city, 120) || !isStr(shipping_postal, 12))
    return bad(res, 'Vul alle bezorggegevens in.')
  if (!isEmail(shipping_email))          return bad(res, 'Vul een geldig e-mailadres in.')
  if (!optStr(shipping_phone, 40))       return bad(res, 'Ongeldig telefoonnummer.')
  if (!optStr(shipping_country, 2))      return bad(res, 'Ongeldige landcode.')
  if (!optStr(notes, 1000))              return bad(res, 'Opmerking is te lang (max 1000 tekens).')
  if (!optStr(school_slug, 80) || !optStr(discount_code, 40)) return bad(res, 'Ongeldige invoer.')

  // Haal winkelwagen op
  const cartR = await db.execute({
    sql: `SELECT ci.quantity, pv.id as variant_id, pv.size, pv.color, pv.stock, pv.product_id,
            p.name, p.price, p.sale_price
          FROM cart_items ci
          JOIN product_variants pv ON pv.id = ci.variant_id
          JOIN products p ON p.id = pv.product_id
          WHERE ci.user_id = ?`,
    args: [req.user.id]
  })
  const items = cartR.rows
  if (!items.length) return res.status(400).json({ error: 'Winkelwagen is leeg.' })

  const subtotal = items.reduce((sum, i) => sum + (i.sale_price || i.price) * i.quantity, 0)

  // ── School (storefront-attributie) ──────────────────────────────────────
  let school = null
  if (school_slug) {
    const sR = await db.execute({ sql: 'SELECT * FROM schools WHERE slug = ? AND active = 1', args: [school_slug] })
    school = sR.rows[0] || null
  }

  // ── Kortingscode ────────────────────────────────────────────────────────
  let code = null, discountAmount = 0
  if (discount_code) {
    const cR = await db.execute({
      sql: 'SELECT * FROM discount_codes WHERE UPPER(code) = ? AND active = 1',
      args: [discount_code.trim().toUpperCase()]
    })
    code = cR.rows[0] || null
    if (!code) return res.status(400).json({ error: 'Ongeldige kortingscode.' })
    if (code.max_uses && code.times_used >= code.max_uses)
      return res.status(400).json({ error: 'Deze kortingscode is niet meer geldig.' })
    discountAmount = Math.round(subtotal * (code.discount_pct / 100) * 100) / 100
    // Code van een vechter koppelt de order ook aan zijn school (als er nog geen school is)
    if (!school && code.school_id) {
      const sR = await db.execute({ sql: 'SELECT * FROM schools WHERE id = ? AND active = 1', args: [code.school_id] })
      school = sR.rows[0] || null
    }
  }

  const shippingCost = subtotal - discountAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total = Math.round((subtotal - discountAmount + shippingCost) * 100) / 100

  // ── Commissies (over goederenwaarde ex btw, na korting) ─────────────────
  const baseExVat = (subtotal - discountAmount) / (1 + BTW_PCT)
  const schoolCommission  = school ? Math.round(baseExVat * (school.commission_pct / 100) * 100) / 100 : 0
  const fighterCommission = code   ? Math.round(baseExVat * (code.commission_pct   / 100) * 100) / 100 : 0

  // ── Order + voorraad + winkelwagen in één transactie ────────────────────
  // De voorraad-afboeking is conditioneel (stock >= aantal), dus twee klanten
  // kunnen nooit allebei het laatste exemplaar reserveren.
  const tx = await db.transaction('write')
  let order
  try {
    for (const item of items) {
      const upd = await tx.execute({
        sql: 'UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?',
        args: [item.quantity, item.variant_id, item.quantity]
      })
      if (Number(upd.rowsAffected) === 0) {
        const err = new Error(`${item.name} (${item.size}) heeft niet genoeg voorraad.`)
        err.status = 400
        throw err
      }
    }

    const orderR = await tx.execute({
      sql: `INSERT INTO orders (user_id,total,subtotal,shipping_cost,discount_code,discount_amount,
              school_id,school_commission,fighter_commission,
              shipping_name,shipping_email,shipping_phone,shipping_address,shipping_city,shipping_postal,shipping_country,notes,status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'awaiting_payment') RETURNING *`,
      args: [req.user.id, total, subtotal, shippingCost, code ? code.code : null, discountAmount,
             school ? school.id : null, schoolCommission, fighterCommission,
             shipping_name.trim(), shipping_email.trim().toLowerCase(), shipping_phone||null,
             shipping_address.trim(), shipping_city.trim(), shipping_postal.trim(), shipping_country||'NL', notes||null]
    })
    order = orderR.rows[0]

    for (const item of items) {
      await tx.execute({
        sql: 'INSERT INTO order_items (order_id,variant_id,product_id,name,size,color,price,quantity) VALUES (?,?,?,?,?,?,?,?)',
        args: [order.id, item.variant_id, item.product_id, item.name, item.size, item.color||null, item.sale_price||item.price, item.quantity]
      })
    }

    await tx.execute({ sql: 'DELETE FROM cart_items WHERE user_id = ?', args: [req.user.id] })
    await tx.commit()
  } catch (e) {
    try { await tx.rollback() } catch (_) {}
    throw e
  }

  // ── Betaling aanmaken (Mollie of mock) — buiten de transactie ───────────
  let payment
  try {
    payment = await mollie.createPayment({
      amount:      total,
      description: `Bestelling #${order.id} — FightMarketing`,
      redirectUrl: `${APP_URL}/bestelling/${order.id}/status`,
      orderId:     order.id,
    })
  } catch (e) {
    // Betaling kon niet worden aangemaakt: annuleer de order en geef de voorraad vrij
    await db.execute({ sql: `UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, args: [order.id] })
    for (const item of items) {
      await db.execute({ sql: 'UPDATE product_variants SET stock = stock + ? WHERE id = ?', args: [item.quantity, item.variant_id] })
    }
    const err = new Error('Betaling kon niet worden gestart. Probeer het opnieuw.')
    err.status = 502
    throw err
  }

  await db.execute({
    sql: `UPDATE orders SET payment_id = ?, payment_method = ? WHERE id = ?`,
    args: [payment.id, payment.mock ? 'mock' : 'mollie', order.id]
  })

  res.status(201).json({
    order_id:     order.id,
    total,
    checkout_url: payment.checkoutUrl,
    mock:         payment.mock,
    message:      'Bestelling aangemaakt — rond de betaling af.',
  })
})

const myOrders = wrap(async (req, res) => {
  const r = await db.execute({
    sql: `SELECT o.*, GROUP_CONCAT(oi.name || ' (' || oi.size || ') x' || oi.quantity, ', ') as items_summary
          FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.user_id = ? GROUP BY o.id ORDER BY o.created_at DESC`,
    args: [req.user.id]
  })
  res.json(r.rows)
})

const getOrder = wrap(async (req, res) => {
  const r = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ? AND user_id = ?', args: [req.params.id, req.user.id] })
  const order = r.rows[0]
  if (!order) return res.status(404).json({ error: 'Bestelling niet gevonden.' })
  const items = await db.execute({ sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [order.id] })
  res.json({ ...order, items: items.rows })
})

// ── Admin ────────────────────────────────────────────────────────────────────

const adminListOrders = wrap(async (req, res) => {
  const { status, school_id } = req.query
  let sql = `SELECT o.*, u.first_name || ' ' || u.last_name as customer_name, s.name as school_name
             FROM orders o LEFT JOIN users u ON u.id = o.user_id LEFT JOIN schools s ON s.id = o.school_id`
  const where = []
  const args = []
  if (status)    { where.push('o.status = ?');    args.push(status) }
  if (school_id) { where.push(school_id === 'none' ? 'o.school_id IS NULL' : 'o.school_id = ?'); if (school_id !== 'none') args.push(Number(school_id)) }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`
  sql += ` ORDER BY o.created_at DESC`
  const r = await db.execute({ sql, args })
  res.json(r.rows)
})

const adminGetOrder = wrap(async (req, res) => {
  const r = await db.execute({ sql: 'SELECT o.*, u.email as customer_email FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = ?', args: [req.params.id] })
  const order = r.rows[0]
  if (!order) return res.status(404).json({ error: 'Niet gevonden.' })
  const items = await db.execute({ sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [order.id] })
  res.json({ ...order, items: items.rows })
})

const adminUpdateOrderStatus = wrap(async (req, res) => {
  const { status } = req.body
  await db.execute({ sql: `UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`, args: [status, req.params.id] })
  res.json({ message: 'Status bijgewerkt.' })
})

/**
 * DELETE /orders/admin/:id — verwijdert een onbetaalde bestelling (bijv. een
 * test- of spookorder). Betaalde bestellingen blijven bewaard voor de
 * administratie. Bij een order die nog op betaling wachtte wordt de
 * gereserveerde voorraad teruggegeven.
 */
const adminDeleteOrder = wrap(async (req, res) => {
  const r = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [req.params.id] })
  const order = r.rows[0]
  if (!order) return res.status(404).json({ error: 'Bestelling niet gevonden.' })
  if (order.paid_at) return res.status(400).json({ error: 'Betaalde bestellingen kunnen niet verwijderd worden (orderhistorie/administratie).' })

  const tx = await db.transaction('write')
  try {
    if (order.status === 'awaiting_payment') {
      const items = (await tx.execute({ sql: 'SELECT variant_id, quantity FROM order_items WHERE order_id = ?', args: [order.id] })).rows
      for (const it of items) {
        await tx.execute({ sql: 'UPDATE product_variants SET stock = stock + ? WHERE id = ?', args: [it.quantity, it.variant_id] })
      }
    }
    await tx.execute({ sql: 'DELETE FROM order_items WHERE order_id = ?', args: [order.id] })
    await tx.execute({ sql: 'DELETE FROM orders WHERE id = ?', args: [order.id] })
    await tx.commit()
  } catch (e) { try { await tx.rollback() } catch (_) {}; throw e }
  res.json({ message: 'Bestelling verwijderd.' })
})

module.exports = { createOrder, myOrders, getOrder, adminListOrders, adminGetOrder, adminUpdateOrderStatus, adminDeleteOrder }
