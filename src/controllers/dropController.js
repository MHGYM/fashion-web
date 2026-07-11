const db = require('../db')
const { isStr, optStr, bad } = require('../middleware/validate')

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

/** Optionele ISO-datum/datetime (leeg mag) */
const optDate = (v) => v == null || v === '' || !Number.isNaN(Date.parse(v))

/** Actieve drop (publiek, voor countdown op storefronts) */
const activeDrop = wrap(async (req, res) => {
  const r = await db.execute(`
    SELECT * FROM drops WHERE active = 1
      AND (opens_at  IS NULL OR datetime(opens_at)  <= datetime('now'))
      AND (closes_at IS NULL OR datetime(closes_at) >= datetime('now'))
    ORDER BY closes_at ASC LIMIT 1`)
  res.json(r.rows[0] || null)
})

// ── Admin ─────────────────────────────────────────────────────────────────────

const list = wrap(async (req, res) => {
  const r = await db.execute(`
    SELECT d.*,
      (SELECT COUNT(*) FROM products p WHERE p.drop_id = d.id AND p.active = 1) as product_count,
      (SELECT COUNT(*) FROM orders o JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
       WHERE p.drop_id = d.id AND o.paid_at IS NOT NULL) as paid_orders
    FROM drops d ORDER BY d.created_at DESC`)
  res.json(r.rows)
})

const create = wrap(async (req, res) => {
  const { name, season, opens_at, closes_at } = req.body
  if (!isStr(name, 120))    return bad(res, 'Naam is verplicht (max 120 tekens).')
  if (!optStr(season, 60))  return bad(res, 'Seizoen is te lang.')
  if (!optDate(opens_at) || !optDate(closes_at)) return bad(res, 'Ongeldige datum.')
  const r = await db.execute({
    sql: 'INSERT INTO drops (name,season,opens_at,closes_at) VALUES (?,?,?,?) RETURNING *',
    args: [name.trim(), season||null, opens_at||null, closes_at||null]
  })
  res.status(201).json(r.rows[0])
})

const update = wrap(async (req, res) => {
  const { name, season, opens_at, closes_at, active } = req.body
  if (!isStr(name, 120))    return bad(res, 'Naam is verplicht (max 120 tekens).')
  if (!optDate(opens_at) || !optDate(closes_at)) return bad(res, 'Ongeldige datum.')
  await db.execute({
    sql: 'UPDATE drops SET name=?,season=?,opens_at=?,closes_at=?,active=? WHERE id=?',
    args: [name.trim(), season||null, opens_at||null, closes_at||null, active === false || active === 0 ? 0 : 1, req.params.id]
  })
  res.json({ message: 'Drop bijgewerkt.' })
})

const remove = wrap(async (req, res) => {
  await db.execute({ sql: 'UPDATE products SET drop_id = NULL WHERE drop_id = ?', args: [req.params.id] })
  await db.execute({ sql: 'DELETE FROM drops WHERE id = ?', args: [req.params.id] })
  res.json({ message: 'Drop verwijderd.' })
})

/** Productielijst per drop: aantallen per product/maat van betaalde orders (voor de drukpers) */
const productionList = wrap(async (req, res) => {
  const r = await db.execute({
    sql: `SELECT oi.name, oi.size, oi.color, SUM(oi.quantity) as quantity, s.name as school_name
          FROM order_items oi
          JOIN orders o   ON o.id = oi.order_id
          JOIN products p ON p.id = oi.product_id
          LEFT JOIN schools s ON s.id = o.school_id
          WHERE p.drop_id = ? AND o.paid_at IS NOT NULL AND o.status != 'cancelled'
          GROUP BY oi.name, oi.size, oi.color, s.name
          ORDER BY oi.name, oi.size`,
    args: [req.params.id]
  })
  res.json(r.rows)
})

module.exports = { activeDrop, list, create, update, remove, productionList }
