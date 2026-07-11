const bcrypt = require('bcryptjs')
const db = require('../db')
const { isEmail, isStr, optStr, isNum, bad } = require('../middleware/validate')

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// ── Public ────────────────────────────────────────────────────────────────────

/** Alle actieve scholen (voor het scholen-overzicht) */
const listSchools = wrap(async (req, res) => {
  const r = await db.execute(`
    SELECT id, name, slug, logo_url, hero_image, tagline, primary_color
    FROM schools WHERE active = 1 ORDER BY name`)
  res.json(r.rows)
})

/** Storefront: school + actieve drop + producten (eigen + algemeen assortiment) */
const getStorefront = wrap(async (req, res) => {
  const sR = await db.execute({ sql: 'SELECT * FROM schools WHERE slug = ? AND active = 1', args: [req.params.slug] })
  const school = sR.rows[0]
  if (!school) return res.status(404).json({ error: 'School niet gevonden.' })
  delete school.iban

  const dropR = await db.execute(`
    SELECT * FROM drops WHERE active = 1
      AND (opens_at  IS NULL OR datetime(opens_at)  <= datetime('now'))
      AND (closes_at IS NULL OR datetime(closes_at) >= datetime('now'))
    ORDER BY closes_at ASC LIMIT 1`)

  const pR = await db.execute({
    sql: `SELECT p.*, c.name as category_name,
            (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image,
            (SELECT SUM(pv.stock) FROM product_variants pv WHERE pv.product_id = p.id) as total_stock
          FROM products p LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.active = 1 AND (p.school_id = ? OR p.school_id IS NULL)
          ORDER BY (p.school_id IS NULL), p.featured DESC, p.created_at DESC`,
    args: [school.id]
  })

  res.json({ school, drop: dropR.rows[0] || null, products: pR.rows })
})

// ── Admin (platform) ──────────────────────────────────────────────────────────

const adminListSchools = wrap(async (req, res) => {
  const r = await db.execute(`
    SELECT s.*,
      (SELECT COUNT(*)                     FROM orders o WHERE o.school_id = s.id AND o.paid_at IS NOT NULL) as paid_orders,
      (SELECT COALESCE(SUM(o.total),0)     FROM orders o WHERE o.school_id = s.id AND o.paid_at IS NOT NULL) as revenue,
      (SELECT COALESCE(SUM(o.school_commission),0) FROM orders o WHERE o.school_id = s.id AND o.paid_at IS NOT NULL) as commission
    FROM schools s ORDER BY s.name`)
  res.json(r.rows)
})

const createSchool = wrap(async (req, res) => {
  const { name, tagline, logo_url, hero_image, primary_color, contact_email, commission_pct, iban,
          admin_email, admin_password, admin_first_name, admin_last_name } = req.body
  if (!isStr(name, 120))          return bad(res, 'Naam is verplicht (max 120 tekens).')
  if (!optStr(tagline, 160) || !optStr(logo_url, 500) || !optStr(hero_image, 500) || !optStr(primary_color, 20) || !optStr(iban, 40))
    return bad(res, 'Ongeldige invoer.')
  if (contact_email && !isEmail(contact_email)) return bad(res, 'Ongeldig contact-e-mailadres.')
  if (commission_pct != null && !isNum(commission_pct, 0, 50)) return bad(res, 'Commissie moet tussen 0 en 50% liggen.')
  if (admin_email && !isEmail(admin_email)) return bad(res, 'Ongeldig e-mailadres voor de school-login.')
  if (admin_password && admin_password.length < 8) return bad(res, 'Wachtwoord voor de school-login moet minimaal 8 tekens zijn.')

  let slug = slugify(name)
  const ex = await db.execute({ sql: 'SELECT id FROM schools WHERE slug = ?', args: [slug] })
  if (ex.rows[0]) slug = `${slug}-${Date.now()}`

  const r = await db.execute({
    sql: `INSERT INTO schools (name,slug,tagline,logo_url,hero_image,primary_color,contact_email,commission_pct,iban)
          VALUES (?,?,?,?,?,?,?,?,?) RETURNING *`,
    args: [name.trim(), slug, tagline||null, logo_url||null, hero_image||null, primary_color||'#111111',
           contact_email||null, commission_pct ?? 15, iban||null]
  })
  const school = r.rows[0]

  // Optioneel direct een school-login aanmaken
  if (admin_email && admin_password) {
    const exU = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [admin_email.toLowerCase()] })
    if (exU.rows[0]) return res.status(409).json({ error: 'School aangemaakt, maar e-mail voor login is al in gebruik.', school })
    const hash = await bcrypt.hash(admin_password, 12)
    await db.execute({
      sql: `INSERT INTO users (email,password,first_name,last_name,role,school_id) VALUES (?,?,?,?,'school',?)`,
      args: [admin_email.toLowerCase(), hash, admin_first_name||name.trim(), admin_last_name||'Beheer', school.id]
    })
  }
  res.status(201).json(school)
})

const updateSchool = wrap(async (req, res) => {
  const { name, tagline, logo_url, hero_image, primary_color, contact_email, commission_pct, iban, active } = req.body
  if (!isStr(name, 120))          return bad(res, 'Naam is verplicht (max 120 tekens).')
  if (contact_email && !isEmail(contact_email)) return bad(res, 'Ongeldig contact-e-mailadres.')
  if (commission_pct != null && !isNum(commission_pct, 0, 50)) return bad(res, 'Commissie moet tussen 0 en 50% liggen.')
  await db.execute({
    sql: `UPDATE schools SET name=?,tagline=?,logo_url=?,hero_image=?,primary_color=?,contact_email=?,commission_pct=?,iban=?,active=? WHERE id=?`,
    args: [name.trim(), tagline||null, logo_url||null, hero_image||null, primary_color||'#111111',
           contact_email||null, commission_pct ?? 15, iban||null, active === false || active === 0 ? 0 : 1, req.params.id]
  })
  res.json({ message: 'School bijgewerkt.' })
})

const deleteSchool = wrap(async (req, res) => {
  await db.execute({ sql: 'UPDATE schools SET active = 0 WHERE id = ?', args: [req.params.id] })
  res.json({ message: 'School gedeactiveerd.' })
})

/** Extra school-login aanmaken voor bestaande school */
const createSchoolLogin = wrap(async (req, res) => {
  const { email, password, first_name, last_name } = req.body
  if (!isEmail(email)) return bad(res, 'Vul een geldig e-mailadres in.')
  if (!isStr(password, 100) || password.length < 8) return bad(res, 'Wachtwoord moet minimaal 8 tekens zijn.')
  const ex = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email.toLowerCase()] })
  if (ex.rows[0]) return res.status(409).json({ error: 'E-mail is al in gebruik.' })
  const hash = await bcrypt.hash(password, 12)
  await db.execute({
    sql: `INSERT INTO users (email,password,first_name,last_name,role,school_id) VALUES (?,?,?,?,'school',?)`,
    args: [email.toLowerCase(), hash, first_name||'School', last_name||'Beheer', req.params.id]
  })
  res.status(201).json({ message: 'School-login aangemaakt.' })
})

// ── School-dashboard (rol 'school') ───────────────────────────────────────────

/** Dashboard-data voor de ingelogde school (of admin met ?school_id=) */
const dashboard = wrap(async (req, res) => {
  const schoolId = req.user.role === 'admin' ? Number(req.query.school_id) : req.user.school_id
  if (!schoolId) return res.status(400).json({ error: 'Geen school gekoppeld aan dit account.' })

  const sR = await db.execute({ sql: 'SELECT id,name,slug,logo_url,primary_color,commission_pct FROM schools WHERE id = ?', args: [schoolId] })
  const school = sR.rows[0]
  if (!school) return res.status(404).json({ error: 'School niet gevonden.' })

  const [totalsR, ordersR, productsR, codesR, monthlyR] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as orders, COALESCE(SUM(total),0) as revenue,
              COALESCE(SUM(school_commission),0) as commission,
              COALESCE(SUM(fighter_commission),0) as fighter_commission
            FROM orders WHERE school_id = ? AND paid_at IS NOT NULL`,
      args: [schoolId]
    }),
    // AVG: geen klant-persoonsgegevens richting de school — alleen ordernummer, datum, bedragen
    db.execute({
      sql: `SELECT id, created_at, total, discount_code, school_commission, status
            FROM orders WHERE school_id = ? AND paid_at IS NOT NULL
            ORDER BY created_at DESC LIMIT 25`,
      args: [schoolId]
    }),
    db.execute({
      sql: `SELECT oi.name, oi.size, SUM(oi.quantity) as sold, SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE o.school_id = ? AND o.paid_at IS NOT NULL
            GROUP BY oi.name, oi.size ORDER BY sold DESC LIMIT 30`,
      args: [schoolId]
    }),
    db.execute({
      sql: `SELECT dc.code, dc.fighter_name, dc.discount_pct, dc.commission_pct, dc.times_used, dc.active,
              (SELECT COALESCE(SUM(o.fighter_commission),0) FROM orders o
               WHERE o.discount_code = dc.code AND o.paid_at IS NOT NULL) as earned
            FROM discount_codes dc WHERE dc.school_id = ? ORDER BY dc.created_at DESC`,
      args: [schoolId]
    }),
    db.execute({
      sql: `SELECT strftime('%Y-%m', paid_at) as month, COUNT(*) as orders,
              COALESCE(SUM(total),0) as revenue, COALESCE(SUM(school_commission),0) as commission
            FROM orders WHERE school_id = ? AND paid_at IS NOT NULL
            GROUP BY month ORDER BY month DESC LIMIT 12`,
      args: [schoolId]
    }),
  ])

  res.json({
    school,
    totals:       totalsR.rows[0],
    recent_orders: ordersR.rows,
    top_products: productsR.rows,
    codes:        codesR.rows,
    monthly:      monthlyR.rows,
  })
})

module.exports = {
  listSchools, getStorefront,
  adminListSchools, createSchool, updateSchool, deleteSchool, createSchoolLogin,
  dashboard,
}
