const db = require('./db')

const PATCHES = [
  `ALTER TABLE categories ADD COLUMN image_url TEXT`,
  `CREATE TABLE IF NOT EXISTS homepage_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  )`,

  // ── Fight Gear Platform ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS schools (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    slug           TEXT NOT NULL UNIQUE,
    logo_url       TEXT,
    hero_image     TEXT,
    tagline        TEXT,
    primary_color  TEXT DEFAULT '#111111',
    contact_email  TEXT,
    commission_pct REAL DEFAULT 15,
    iban           TEXT,
    active         INTEGER DEFAULT 1,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS drops (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    season     TEXT,
    opens_at   DATETIME,
    closes_at  DATETIME,
    active     INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS discount_codes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    code           TEXT NOT NULL UNIQUE,
    school_id      INTEGER REFERENCES schools(id),
    fighter_name   TEXT,
    discount_pct   REAL DEFAULT 10,
    commission_pct REAL DEFAULT 5,
    max_uses       INTEGER,
    times_used     INTEGER DEFAULT 0,
    active         INTEGER DEFAULT 1,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE users    ADD COLUMN school_id INTEGER REFERENCES schools(id)`,
  `ALTER TABLE products ADD COLUMN school_id INTEGER REFERENCES schools(id)`,
  `ALTER TABLE products ADD COLUMN drop_id   INTEGER REFERENCES drops(id)`,
  `ALTER TABLE orders   ADD COLUMN school_id INTEGER REFERENCES schools(id)`,
  `ALTER TABLE orders   ADD COLUMN subtotal  REAL`,
  `ALTER TABLE orders   ADD COLUMN shipping_cost REAL DEFAULT 0`,
  `ALTER TABLE orders   ADD COLUMN discount_code TEXT`,
  `ALTER TABLE orders   ADD COLUMN discount_amount REAL DEFAULT 0`,
  `ALTER TABLE orders   ADD COLUMN school_commission REAL DEFAULT 0`,
  `ALTER TABLE orders   ADD COLUMN fighter_commission REAL DEFAULT 0`,
  `ALTER TABLE orders   ADD COLUMN paid_at DATETIME`,
]

const HOMEPAGE_DEFAULTS = [
  ['hero_image',   'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1920&q=80'],
  ['hero_overline','Hét fight gear platform van Nederland'],
  ['hero_heading', 'JOUW CLUB.|JOUW GEAR.'],
  ['hero_cta',     'Ontdek de shop'],
]

// Oude SeasonFits-defaults → alleen overschrijven als de admin ze nooit aanpaste
const LEGACY_HOMEPAGE_VALUES = [
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
  // Rebrand: vervang oude SeasonFits-defaults door FightMarketing-defaults,
  // maar respecteer teksten die de admin zelf heeft aangepast
  for (let i = 0; i < HOMEPAGE_DEFAULTS.length; i++) {
    const [key, newValue] = HOMEPAGE_DEFAULTS[i]
    const [, legacyValue] = LEGACY_HOMEPAGE_VALUES[i]
    try {
      await db.execute({
        sql:  'UPDATE homepage_settings SET value = ? WHERE key = ? AND value = ?',
        args: [newValue, key, legacyValue],
      })
    } catch (_) {}
  }
}

module.exports = { ensureSchema }
