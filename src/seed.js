require('dotenv').config()
const bcrypt = require('bcryptjs')
const { createClient } = require('@libsql/client')
const db = createClient({ url: process.env.DATABASE_URL || 'file:./seasonfits.db' })

/** Zoekt een categorie op slug; maakt hem aan als hij (nog) niet bestaat. */
async function ensureCategory(name, slug, sortOrder) {
  await db.execute({
    sql: 'INSERT OR IGNORE INTO categories (name, slug, sort_order) VALUES (?,?,?)',
    args: [name, slug, sortOrder]
  })
  const r = await db.execute({ sql: 'SELECT id FROM categories WHERE slug = ?', args: [slug] })
  return r.rows[0].id
}

async function seed() {
  // Admin account
  const hash = await bcrypt.hash('admin123', 12)
  await db.execute({
    sql: `INSERT OR IGNORE INTO users (email,password,first_name,last_name,role) VALUES (?,?,?,?,'admin')`,
    args: ['admin@fightmarketing.nl', hash, 'Mohammed', 'Admin']
  })
  console.log('Admin: admin@fightmarketing.nl / admin123')

  // Categorieën op slug (niet op hardcoded id — die kunnen gewijzigd zijn)
  const cats = {
    tshirts: await ensureCategory('T-shirts', 't-shirts', 1),
    hoodies: await ensureCategory('Hoodies', 'hoodies', 2),
    shorts:  await ensureCategory('Shorts', 'shorts', 3),
    joggers: await ensureCategory('Joggingbroeken', 'joggingbroeken', 4),
  }

  // Voorbeeldproducten (algemeen assortiment)
  const products = [
    { name:'Essentials Training T-shirt', cat:cats.tshirts, price:29.95, sale:null, gender:'unisex', featured:1, desc:'Luchtig katoenen t-shirt, perfect voor elke training.', img:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600' },
    { name:'Heavy Bag Hoodie', cat:cats.hoodies, price:59.95, sale:44.95, gender:'men', featured:1, desc:'Zachte hoodie voor voor en na de training.', img:'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600' },
    { name:'Sparring Shorts', cat:cats.shorts, price:34.95, sale:null, gender:'men', featured:0, desc:'Comfortabele shorts met veel bewegingsvrijheid.', img:'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=600' },
    { name:'Combat Tee', cat:cats.tshirts, price:24.95, sale:19.95, gender:'women', featured:1, desc:'Stijlvol dames trainingsshirt.', img:'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600' },
    { name:'Recovery Joggers', cat:cats.joggers, price:49.95, sale:null, gender:'unisex', featured:0, desc:'Comfy joggingbroek voor rustdagen.', img:'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=600' },
    { name:'Warm-up Crop Top', cat:cats.tshirts, price:22.95, sale:null, gender:'women', featured:1, desc:'Trendy crop top voor de warming-up.', img:'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600' },
  ]

  const SIZES = ['XS','S','M','L','XL','XXL']

  for (const p of products) {
    const ex = await db.execute({ sql: 'SELECT id FROM products WHERE name = ?', args: [p.name] })
    if (ex.rows[0]) continue
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Date.now()
    const pr = await db.execute({
      sql: `INSERT INTO products (name,slug,description,price,sale_price,category_id,gender,featured) VALUES (?,?,?,?,?,?,?,?) RETURNING id`,
      args: [p.name, slug, p.desc, p.price, p.sale||null, p.cat, p.gender, p.featured]
    })
    const pid = pr.rows[0]?.id
    if (!pid) continue
    await db.execute({ sql: 'INSERT INTO product_images (product_id,url,sort_order) VALUES (?,?,0)', args: [pid, p.img] })
    for (const size of SIZES) {
      await db.execute({ sql: 'INSERT INTO product_variants (product_id,size,stock) VALUES (?,?,?)', args: [pid, size, Math.floor(Math.random()*20)+5] })
    }
  }
  console.log('Voorbeeldproducten aangemaakt!')
  process.exit(0)
}
seed().catch(e => { console.error(e); process.exit(1) })
