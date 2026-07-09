const db = require('../db')

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

/**
 * Valideert een kortingscode. Publiek aanroepbaar vanuit de checkout.
 * Retourneert de kortingsinfo zonder gevoelige velden.
 */
const validate = wrap(async (req, res) => {
  const code = (req.body.code || '').trim().toUpperCase()
  if (!code) return res.status(400).json({ error: 'Geen code opgegeven.' })

  const r = await db.execute({ sql: 'SELECT * FROM discount_codes WHERE UPPER(code) = ? AND active = 1', args: [code] })
  const dc = r.rows[0]
  if (!dc) return res.status(404).json({ error: 'Ongeldige kortingscode.' })
  if (dc.max_uses && dc.times_used >= dc.max_uses)
    return res.status(410).json({ error: 'Deze code is niet meer geldig.' })

  res.json({ code: dc.code, discount_pct: dc.discount_pct, fighter_name: dc.fighter_name || null })
})

// ── Beheer ────────────────────────────────────────────────────────────────────
// Platform-admin ziet/beheert alles; een school-login alleen de eigen codes.

const list = wrap(async (req, res) => {
  let sql = `SELECT dc.*, s.name as school_name,
      (SELECT COUNT(*) FROM orders o WHERE o.discount_code = dc.code AND o.paid_at IS NOT NULL) as paid_orders,
      (SELECT COALESCE(SUM(o.fighter_commission),0) FROM orders o WHERE o.discount_code = dc.code AND o.paid_at IS NOT NULL) as earned
    FROM discount_codes dc LEFT JOIN schools s ON s.id = dc.school_id`
  const args = []
  if (req.user.role !== 'admin') { sql += ' WHERE dc.school_id = ?'; args.push(req.user.school_id) }
  sql += ' ORDER BY dc.created_at DESC'
  const r = await db.execute({ sql, args })
  res.json(r.rows)
})

const create = wrap(async (req, res) => {
  let { code, school_id, fighter_name, discount_pct, commission_pct, max_uses } = req.body
  code = (code || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!code) return res.status(400).json({ error: 'Code is verplicht.' })

  // School-login mag alleen codes voor de eigen school maken
  if (req.user.role !== 'admin') school_id = req.user.school_id
  if (!school_id) return res.status(400).json({ error: 'Kies een school.' })

  const ex = await db.execute({ sql: 'SELECT id FROM discount_codes WHERE UPPER(code) = ?', args: [code] })
  if (ex.rows[0]) return res.status(409).json({ error: 'Deze code bestaat al.' })

  const r = await db.execute({
    sql: `INSERT INTO discount_codes (code,school_id,fighter_name,discount_pct,commission_pct,max_uses)
          VALUES (?,?,?,?,?,?) RETURNING *`,
    args: [code, school_id, fighter_name||null, discount_pct ?? 10, commission_pct ?? 5, max_uses||null]
  })
  res.status(201).json(r.rows[0])
})

const update = wrap(async (req, res) => {
  const { fighter_name, discount_pct, commission_pct, max_uses, active } = req.body
  const r = await db.execute({ sql: 'SELECT * FROM discount_codes WHERE id = ?', args: [req.params.id] })
  const dc = r.rows[0]
  if (!dc) return res.status(404).json({ error: 'Code niet gevonden.' })
  if (req.user.role !== 'admin' && dc.school_id !== req.user.school_id)
    return res.status(403).json({ error: 'Geen toegang.' })

  await db.execute({
    sql: `UPDATE discount_codes SET fighter_name=?,discount_pct=?,commission_pct=?,max_uses=?,active=? WHERE id=?`,
    args: [fighter_name ?? dc.fighter_name, discount_pct ?? dc.discount_pct, commission_pct ?? dc.commission_pct,
           max_uses ?? dc.max_uses, active === false || active === 0 ? 0 : 1, req.params.id]
  })
  res.json({ message: 'Code bijgewerkt.' })
})

const remove = wrap(async (req, res) => {
  const r = await db.execute({ sql: 'SELECT * FROM discount_codes WHERE id = ?', args: [req.params.id] })
  const dc = r.rows[0]
  if (!dc) return res.status(404).json({ error: 'Code niet gevonden.' })
  if (req.user.role !== 'admin' && dc.school_id !== req.user.school_id)
    return res.status(403).json({ error: 'Geen toegang.' })
  await db.execute({ sql: 'UPDATE discount_codes SET active = 0 WHERE id = ?', args: [req.params.id] })
  res.json({ message: 'Code gedeactiveerd.' })
})

module.exports = { validate, list, create, update, remove }
