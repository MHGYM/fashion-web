require('dotenv').config()
const { createClient } = require('@libsql/client')

const db = createClient({ url: process.env.DATABASE_URL || 'file:./seasonfits.db' })

async function migrate() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      first_name  TEXT    NOT NULL,
      last_name   TEXT    NOT NULL,
      phone       TEXT,
      address     TEXT,
      city        TEXT,
      postal_code TEXT,
      country     TEXT    DEFAULT 'NL',
      role        TEXT    DEFAULT 'customer',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      slug       TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      slug          TEXT    NOT NULL UNIQUE,
      description   TEXT,
      price         REAL    NOT NULL,
      sale_price    REAL,
      category_id   INTEGER REFERENCES categories(id),
      gender        TEXT    DEFAULT 'unisex',
      featured      INTEGER DEFAULT 0,
      active        INTEGER DEFAULT 1,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS product_images (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url        TEXT    NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS product_variants (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      size       TEXT    NOT NULL,
      color      TEXT,
      stock      INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS cart_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
      quantity   INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, variant_id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER REFERENCES users(id),
      status           TEXT    DEFAULT 'pending',
      total            REAL    NOT NULL,
      shipping_name    TEXT    NOT NULL,
      shipping_email   TEXT    NOT NULL,
      shipping_phone   TEXT,
      shipping_address TEXT    NOT NULL,
      shipping_city    TEXT    NOT NULL,
      shipping_postal  TEXT    NOT NULL,
      shipping_country TEXT    DEFAULT 'NL',
      notes            TEXT,
      payment_method   TEXT,
      payment_id       TEXT,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      variant_id INTEGER NOT NULL REFERENCES product_variants(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      name       TEXT    NOT NULL,
      size       TEXT    NOT NULL,
      color      TEXT,
      price      REAL    NOT NULL,
      quantity   INTEGER NOT NULL
    );
  `)

  await db.executeMultiple(`
    INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES ('T-shirts', 't-shirts', 1);
    INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES ('Hoodies', 'hoodies', 2);
    INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES ('Shorts', 'shorts', 3);
    INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES ('Joggingbroeken', 'joggingbroeken', 4);
    INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES ('Accessoires', 'accessoires', 5);
  `)

  console.log('Migratie geslaagd!')
  process.exit(0)
}

migrate().catch(e => { console.error(e); process.exit(1) })
