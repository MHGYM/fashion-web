const db = require('../db')

/** Wraps async handlers so thrown errors reach Express error middleware */
const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const createOrder = wrap(async (req, res) => {
  const { shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_postal, shipping_country, notes } = req.body

  if (!shipping_name || !shipping_email || !shipping_address || !shipping_city || !shipping_postal)
    return res.status(400).json({ error: 'Vul alle bezorggegevens in.' })

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

  // Controleer voorraad
  for (const item of items) {
    if (item.stock < item.quantity) return res.status(400).json({ error: `${item.name} (${item.size}) heeft niet genoeg voorraad.` })
  }

  const total = items.reduce((sum, i) => sum + (i.sale_price || i.price) * i.quantity, 0)

  const orderR = await db.execute({
    sql: `INSERT INTO orders (user_id,total,shipping_name,shipping_email,shipping_phone,shipping_address,shipping_city,shipping_postal,shipping_country,notes,status)
          VALUES (?,?,?,?,?,?,?,?,?,?,'pending') RETURNING *`,
    args: [req.user.id, total, shipping_name, shipping_email, shipping_phone||null, shipping_address, shipping_city, shipping_postal, shipping_country||'NL', notes||null]
  })
  const order = orderR.rows[0]

  for (const item of items) {
    await db.execute({
      sql: 'INSERT INTO order_items (order_id,variant_id,product_id,name,size,color,price,quantity) VALUES (?,?,?,?,?,?,?,?)',
      args: [order.id, item.variant_id, item.product_id, item.name, item.size, item.color||null, item.sale_price||item.price, item.quantity]
    })
    await db.execute({
      sql: 'UPDATE product_variants SET stock = stock - ? WHERE id = ?',
      args: [item.quantity, item.variant_id]
    })
  }

  // Winkelwagen legen
  await db.execute({ sql: 'DELETE FROM cart_items WHERE user_id = ?', args: [req.user.id] })

  res.status(201).json({ order_id: order.id, total, message: 'Bestelling geplaatst!' })
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
  const { status } = req.query
  let sql = `SELECT o.*, u.first_name || ' ' || u.last_name as customer_name
             FROM orders o LEFT JOIN users u ON u.id = o.user_id`
  const args = []
  if (status) { sql += ` WHERE o.status = ?`; args.push(status) }
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

module.exports = { createOrder, myOrders, getOrder, adminListOrders, adminGetOrder, adminUpdateOrderStatus }
