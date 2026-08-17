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
  `ALTER TABLE drops    ADD COLUMN notified_at DATETIME`,
  `CREATE TABLE IF NOT EXISTS school_products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id  INTEGER NOT NULL REFERENCES schools(id)  ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    active     INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, product_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_school_products_school ON school_products(school_id)`,
  `CREATE TABLE IF NOT EXISTS drop_subscribers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL UNIQUE,
    school_id  INTEGER REFERENCES schools(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used       INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // ── Indexes op veelgebruikte kolommen (slug/code hebben al UNIQUE-indexes) ──
  `CREATE INDEX IF NOT EXISTS idx_products_school     ON products(school_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_drop       ON products(drop_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_active     ON products(active)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_school       ON orders(school_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_user         ON orders(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_payment      ON orders(payment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_paid_at      ON orders(paid_at)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_discount     ON orders(discount_code)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_variants_product    ON product_variants(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_images_product      ON product_images(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cart_user           ON cart_items(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_school        ON users(school_id)`,
  `CREATE INDEX IF NOT EXISTS idx_codes_school        ON discount_codes(school_id)`,

  // ── Custom-configurator ──────────────────────────────────────────────────────
  `ALTER TABLE order_items ADD COLUMN custom_config TEXT`,
  `CREATE TABLE IF NOT EXISTS custom_cart_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    config     TEXT    NOT NULL,
    price      REAL    NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_custom_cart_user ON custom_cart_items(user_id)`,
]

const HOMEPAGE_DEFAULTS = [
  ['hero_image',    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1920&q=80'],
  ['hero_video',    ''],
  // Achtergrondvideo van de Customizer-promosectie op de homepage (tussen hero
  // en "Shop per categorie"). Startwaarde is de door de klant aangeleverde
  // video, eenmalig gekopieerd naar UPLOADS_DIR — verder identiek behandeld
  // als hero_video: door de admin te vervangen via Homepage-beheer, geen
  // codewijziging nodig.
  ['customizer_video', '/uploads/1786786705468-ubcb2dom87n.mp4'],
  ['hero_overline', 'Hét fight gear platform van Nederland'],
  ['hero_heading',  'JOUW CLUB.|JOUW GEAR.'],
  ['hero_cta',      'Ontdek de shop'],
  ['hero_cta_link', '/shop'],
  // Promo-banner (bewerkbaar via de Homepage-editor)
  ['promo_visible',  '1'],
  ['promo_image',    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80'],
  ['promo_overline', 'Limited Drop'],
  ['promo_heading',  'DE SEIZOENSCOLLECTIE|IS ER.'],
  ['promo_cta',      'Ontdek nu'],
  ['promo_cta_link', '/shop'],
  // Sectietitels
  ['featured_title', 'Nieuw binnen'],
  ['sale_title',     'Sale'],
  // USP-balk onderaan de homepage (titel + subtekst per blok)
  ['usp1_title', 'Snelle levering'], ['usp1_sub', '1–3 werkdagen'],
  ['usp2_title', 'Gratis retour'],   ['usp2_sub', '30 dagen'],
  ['usp3_title', 'Veilig betalen'],  ['usp3_sub', 'iDEAL & meer'],
  ['usp4_title', 'Klantenservice'],  ['usp4_sub', 'Altijd bereikbaar'],
]

// Oude SeasonFits/SummerFits-teksten → alleen overschrijven als de waarde nog
// exact zo'n oude merktekst is (eigen teksten van de admin blijven staan)
const LEGACY_HOMEPAGE_VALUES = [
  ['hero_image',   ['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1920&q=80']],
  ['hero_overline',['Nieuwe collectie — 2025']],
  ['hero_heading', ['DEFINE YOUR STYLE', 'YOUR FIT FOR EVERY SEASON', 'YOUR FIT|FOR EVERY SEASON']],
  ['hero_cta',     ['Koop Nu']],
]

async function ensureSchema() {
  for (const sql of PATCHES) {
    try { await db.execute(sql) } catch (_) {}
  }

  // ── Eerste admin-account op een verse (productie)database ──────────────────
  // Alleen als er nog géén admin bestaat en ADMIN_EMAIL + ADMIN_PASSWORD als
  // omgevingsvariabelen zijn gezet — geen hardcoded wachtwoorden in productie.
  try {
    const admins = await db.execute(`SELECT COUNT(*) as n FROM users WHERE role = 'admin'`)
    if (Number(admins.rows[0].n) === 0) {
      if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
        const bcrypt = require('bcryptjs')
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
        await db.execute({
          sql: `INSERT INTO users (email,password,first_name,last_name,role) VALUES (?,?,?,?,'admin')`,
          args: [process.env.ADMIN_EMAIL.toLowerCase(), hash, 'Platform', 'Admin']
        })
        console.log(`[DB] Eerste admin-account aangemaakt: ${process.env.ADMIN_EMAIL}`)
      } else {
        console.warn('[DB] Geen admin-account gevonden. Zet ADMIN_EMAIL en ADMIN_PASSWORD als env-variabelen of draai npm run seed.')
      }
    }
  } catch (e) { console.error('[DB] admin-bootstrap:', e.message) }

  // ── Eenmalige admin-wachtwoordreset (herstel bij lockout) ──────────────────
  // Zet ADMIN_RESET=1 + ADMIN_EMAIL + ADMIN_PASSWORD in de omgeving en deploy
  // opnieuw: het wachtwoord van dat admin-account wordt (her)ingesteld op de
  // waarde van ADMIN_PASSWORD. Bestaat het account niet, dan wordt het als
  // admin aangemaakt. Zet ADMIN_RESET daarna weer uit.
  try {
    if (process.env.ADMIN_RESET === '1' && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const bcrypt = require('bcryptjs')
      const adminEmail = process.env.ADMIN_EMAIL.toLowerCase()
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
      const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [adminEmail] })
      if (existing.rows[0]) {
        await db.execute({ sql: `UPDATE users SET password = ?, role = 'admin' WHERE email = ?`, args: [hash, adminEmail] })
        console.log(`[DB] ADMIN_RESET: wachtwoord van ${adminEmail} opnieuw ingesteld.`)
      } else {
        await db.execute({
          sql: `INSERT INTO users (email,password,first_name,last_name,role) VALUES (?,?,?,?,'admin')`,
          args: [adminEmail, hash, 'Platform', 'Admin']
        })
        console.log(`[DB] ADMIN_RESET: admin-account ${adminEmail} aangemaakt.`)
      }
      console.warn('[DB] ADMIN_RESET is actief — zet deze variabele weer uit na inloggen.')
    }
  } catch (e) { console.error('[DB] ADMIN_RESET mislukt:', e.message) }

  // ── Centrale catalogus: eenmalige backfill ─────────────────────────────────
  // Vóór deze migratie stonden alle 'algemeen assortiment'-producten in élke
  // clubshop. Die situatie behouden we door ze eenmalig voor alle bestaande
  // scholen te activeren; daarna kiest elke school zelf wat erbij komt.
  try {
    const migrated = await db.execute(`SELECT value FROM homepage_settings WHERE key = 'catalog_migrated'`)
    if (!migrated.rows[0]) {
      await db.execute(`
        INSERT OR IGNORE INTO school_products (school_id, product_id, active)
        SELECT s.id, p.id, 1 FROM schools s CROSS JOIN products p WHERE p.school_id IS NULL`)
      await db.execute(`INSERT OR IGNORE INTO homepage_settings (key, value) VALUES ('catalog_migrated', '1')`)
      console.log('[DB] Centrale catalogus: bestaande algemene producten voor alle scholen geactiveerd.')
    }
  } catch (e) { console.error('[DB] catalogus-backfill:', e.message) }

  // ── Custom-configurator: seed de twee custom producten (idempotent) ──────────
  // active=0 → ze verschijnen niet in de gewone shop; ze zijn alleen via
  // /customize te bestellen. Ze bestaan wél zodat cart/order een echte
  // product_id + variant_id hebben. Ruime voorraad (made-to-order).
  try {
    const seedCustom = async (slug, name, price, sizes) => {
      const r = await db.execute({ sql: 'SELECT id FROM products WHERE slug = ?', args: [slug] })
      let pid = r.rows[0]?.id
      if (!pid) {
        const ins = await db.execute({
          sql: `INSERT INTO products (name, slug, description, price, active, gender, featured)
                VALUES (?,?,?,?,0,'unisex',0) RETURNING id`,
          args: [name, slug, 'Volledig zelf samen te stellen via de Customizer.', price],
        })
        pid = ins.rows[0].id
      } else {
        await db.execute({ sql: 'UPDATE products SET price = ? WHERE id = ?', args: [price, pid] })
      }
      for (const size of sizes) {
        const v = await db.execute({ sql: 'SELECT id FROM product_variants WHERE product_id = ? AND size = ?', args: [pid, size] })
        if (!v.rows[0]) await db.execute({ sql: 'INSERT INTO product_variants (product_id, size, stock) VALUES (?,?,9999)', args: [pid, size] })
      }
    }
    // 129.95 moet gelijk blijven aan PRICING.base in
    // client/public/configurator/js/zones.js EN aan CUSTOM_GLOVE_PRICING.base
    // in customizerController.js — dit is de basisprijs die de klant overal
    // ziet en betaalt. Was per ongeluk 69.95 (oude/nooit-bijgewerkte waarde),
    // waardoor de daadwerkelijk in rekening gebrachte prijs structureel
    // afweek van wat de configurator liet zien.
    await seedCustom('custom-gloves',     'Custom Gloves',      129.95, ['8oz', '10oz', '12oz', '14oz', '16oz'])
    await seedCustom('custom-shinguards', 'Custom Shin Guards', 49.95, ['S', 'M', 'L', 'XL'])
    // 25.95 moet gelijk blijven aan PRICING.base in
    // client/public/configurator-shirt/js/zones.js EN aan
    // CUSTOM_JERSEY_PRICING.base in customizerController.js.
    await seedCustom('custom-jersey', 'Custom Fight Jersey', 25.95, ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'])
  } catch (e) { console.error('[DB] custom-producten seed:', e.message) }

  for (const [key, value] of HOMEPAGE_DEFAULTS) {
    try {
      await db.execute({
        sql:  'INSERT OR IGNORE INTO homepage_settings (key,value) VALUES (?,?)',
        args: [key, value],
      })
    } catch (_) {}
  }
  // Rebrand: vervang oude SeasonFits/SummerFits-teksten door FightMarketing-
  // defaults, maar respecteer teksten die de admin zelf heeft aangepast
  for (const [key, legacyValues] of LEGACY_HOMEPAGE_VALUES) {
    const def = HOMEPAGE_DEFAULTS.find(d => d[0] === key)
    if (!def) continue
    for (const legacyValue of legacyValues) {
      try {
        await db.execute({
          sql:  'UPDATE homepage_settings SET value = ? WHERE key = ? AND value = ?',
          args: [def[1], key, legacyValue],
        })
      } catch (_) {}
    }
  }
}

module.exports = { ensureSchema }
