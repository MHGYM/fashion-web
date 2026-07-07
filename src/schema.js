const db = require('./db')

const PATCHES = [
  `ALTER TABLE categories ADD COLUMN image_url TEXT`,
  `CREATE TABLE IF NOT EXISTS homepage_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  )`,
]

const HOMEPAGE_DEFAULTS = [
  ['hero_image',   'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1920&q=80'],
  ['hero_overline','Nieuwe collectie — 2025'],
  ['hero_heading', 'DEFINE YOUR STYLE'],
  ['hero_cta',     'Koop Nu'],
]

async function ensureSchema() {
  for (const sql of PATCHES) {
    try { await db.execute(sql) } catch (_) {}
  }
  for (const [key, value] of HOMEPAGE_DEFAULTS) {
    try {
      await db.execute({
        sql:  'INSERT OR IGNORE INTO homepage_settings (key,value) VALUES (?,?)',
        args: [key, value],
      })
    } catch (_) {}
  }
}

module.exports = { ensureSchema }
