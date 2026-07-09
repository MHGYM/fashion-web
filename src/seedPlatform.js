/**
 * Demodata voor het Fight Gear Platform.
 * Draaien met: npm run seed:platform
 * Idempotent: bestaande data wordt niet gedupliceerd.
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { createClient } = require('@libsql/client')
const { ensureSchema } = require('./schema')
const db = createClient({ url: process.env.DATABASE_URL || 'file:./seasonfits.db' })

async function seed() {
  await ensureSchema()

  // ── Demo-scholen ──────────────────────────────────────────────────────────
  const schools = [
    { name: 'MH Gym', slug: 'mh-gym', tagline: 'Kickboksen & MMA', color: '#b91c1c',
      hero: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1600&q=80' },
    { name: 'Team Vechtlust', slug: 'team-vechtlust', tagline: 'Muay Thai voor iedereen', color: '#1d4ed8',
      hero: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=1600&q=80' },
  ]
  const schoolIds = {}
  for (const s of schools) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO schools (name,slug,tagline,primary_color,hero_image,commission_pct) VALUES (?,?,?,?,?,15)`,
      args: [s.name, s.slug, s.tagline, s.color, s.hero]
    })
    const r = await db.execute({ sql: 'SELECT id FROM schools WHERE slug = ?', args: [s.slug] })
    schoolIds[s.slug] = r.rows[0].id
  }

  // ── School-login voor MH Gym ─────────────────────────────────────────────
  const hash = await bcrypt.hash('school123', 12)
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (email,password,first_name,last_name,role,school_id) VALUES (?,?,?,?,'school',?)`,
    args: ['beheer@mhgym.nl', hash, 'MH Gym', 'Beheer', schoolIds['mh-gym']]
  })

  // ── Categorie Fight Gear ─────────────────────────────────────────────────
  await db.execute(`INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES ('Fight Gear', 'fight-gear', 6)`)
  const catR = await db.execute(`SELECT id FROM categories WHERE slug = 'fight-gear'`)
  const catId = catR.rows[0].id

  // ── Actieve drop (bestelvenster: nu + 21 dagen) ──────────────────────────
  const dropEx = await db.execute(`SELECT id FROM drops WHERE name = 'Herfstdrop 2026'`)
  let dropId = dropEx.rows[0]?.id
  if (!dropId) {
    const closes = new Date(Date.now() + 21 * 86400000).toISOString()
    const r = await db.execute({
      sql: `INSERT INTO drops (name,season,opens_at,closes_at,active) VALUES ('Herfstdrop 2026','Herfst 2026',datetime('now'),?,1) RETURNING id`,
      args: [closes]
    })
    dropId = r.rows[0].id
  }

  // ── Clubproducten ────────────────────────────────────────────────────────
  const products = [
    { school: 'mh-gym', name: 'MH Gym Fight Shirt', price: 29.95, sizes: ['S','M','L','XL','XXL'],
      desc: 'Officieel MH Gym trainingsshirt — ademend en duurzaam bedrukt.',
      img: 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=600&q=80' },
    { school: 'mh-gym', name: 'MH Gym Hoodie', price: 54.95, sizes: ['S','M','L','XL','XXL'],
      desc: 'Warme hoodie met groot MH Gym-logo op de rug.',
      img: 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80' },
    { school: 'mh-gym', name: 'MH Gym Handbandages 4,5m', price: 12.95, sizes: ['One size'],
      desc: 'Professionele bandages in clubkleuren, per paar.',
      img: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&q=80' },
    { school: 'team-vechtlust', name: 'Vechtlust Rashguard', price: 44.95, sizes: ['S','M','L','XL'],
      desc: 'Full-print rashguard van Team Vechtlust — sneldrogend.',
      img: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=600&q=80' },
    { school: 'team-vechtlust', name: 'Vechtlust Muay Thai Short', price: 39.95, sizes: ['S','M','L','XL'],
      desc: 'Traditionele Muay Thai short in clubkleuren.',
      img: 'https://images.unsplash.com/photo-1595078475328-1ab05d0a6a0e?w=600&q=80' },
  ]

  for (const p of products) {
    const ex = await db.execute({ sql: 'SELECT id FROM products WHERE name = ?', args: [p.name] })
    if (ex.rows[0]) continue
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    const r = await db.execute({
      sql: `INSERT INTO products (name,slug,description,price,category_id,gender,featured,active,school_id,drop_id)
            VALUES (?,?,?,?,?,'unisex',0,1,?,?) RETURNING id`,
      args: [p.name, slug, p.desc, p.price, catId, schoolIds[p.school], dropId]
    })
    const pid = r.rows[0].id
    await db.execute({ sql: 'INSERT INTO product_images (product_id,url,sort_order) VALUES (?,?,0)', args: [pid, p.img] })
    for (const size of p.sizes) {
      await db.execute({ sql: 'INSERT INTO product_variants (product_id,size,stock) VALUES (?,?,25)', args: [pid, size] })
    }
  }

  // ── Kortingscodes (vechters) ─────────────────────────────────────────────
  const codes = [
    { code: 'MO10',    school: 'mh-gym',         fighter: 'Mo "The Hammer"', discount: 10, commission: 5 },
    { code: 'KHALID5', school: 'team-vechtlust', fighter: 'Khalid B.',        discount: 5,  commission: 5 },
  ]
  for (const c of codes) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO discount_codes (code,school_id,fighter_name,discount_pct,commission_pct) VALUES (?,?,?,?,?)`,
      args: [c.code, schoolIds[c.school], c.fighter, c.discount, c.commission]
    })
  }

  console.log('Platform-demodata klaar!')
  console.log('School-login:  beheer@mhgym.nl / school123  →  /dashboard')
  console.log('Clubshops:     /s/mh-gym  en  /s/team-vechtlust')
  console.log('Codes:         MO10 (10%) en KHALID5 (5%)')
  process.exit(0)
}
seed().catch(e => { console.error(e); process.exit(1) })
