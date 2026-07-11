const db = require('../db')

// ── Helper ────────────────────────────────────────────────────────────────────

/** Wraps async route handlers so thrown errors reach the Express error handler */
const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// ── Public ────────────────────────────────────────────────────────────────────

const listProducts = wrap(async (req, res) => {
  const { category, gender, featured, search, sale, active, school } = req.query
  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug, s.name as school_name,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image,
      (SELECT SUM(pv.stock) FROM product_variants pv WHERE pv.product_id = p.id) as total_stock
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN schools    s ON s.id = p.school_id
    WHERE 1=1
  `
  const args = []

  if (active === 'all')     { /* geen filter */ }
  else if (active === '0')  { sql += ' AND p.active = 0' }
  else                      { sql += ' AND p.active = 1' }

  // School-filter: publiek toont standaard alleen het algemene assortiment;
  // admin (active=all) of expliciet school-param toont meer
  if (school === 'all' || active === 'all') { /* geen filter */ }
  else if (school)                          { sql += ' AND p.school_id = ?'; args.push(school) }
  else                                      { sql += ' AND p.school_id IS NULL' }

  if (category)                   { sql += ' AND c.slug = ?';                                     args.push(category) }
  if (gender && gender !== 'all') { sql += ` AND (p.gender = ? OR p.gender = 'unisex')`;          args.push(gender) }
  if (featured)                   { sql += ' AND p.featured = 1' }
  if (sale)                       { sql += ' AND p.sale_price IS NOT NULL' }
  if (search)                     { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';        args.push(`%${search}%`, `%${search}%`) }
  sql += ' ORDER BY p.featured DESC, p.created_at DESC'

  const r = await db.execute({ sql, args })
  res.json(r.rows)
})

const getProduct = wrap(async (req, res) => {
  const { slug } = req.params
  const r = await db.execute({
    sql: `SELECT p.*, c.name as category_name, c.slug as category_slug
          FROM products p LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.slug = ? AND p.active = 1`,
    args: [slug]
  })
  const product = r.rows[0]
  if (!product) return res.status(404).json({ error: 'Product niet gevonden.' })

  const images   = await db.execute({ sql: 'SELECT * FROM product_images   WHERE product_id = ? ORDER BY sort_order', args: [product.id] })
  const variants = await db.execute({ sql: 'SELECT * FROM product_variants WHERE product_id = ? ORDER BY id',         args: [product.id] })
  res.json({ ...product, images: images.rows, variants: variants.rows })
})

const listCategories = wrap(async (req, res) => {
  const r = await db.execute('SELECT id, name, slug, sort_order, image_url FROM categories ORDER BY sort_order')
  res.json(r.rows)
})

// ── Admin ─────────────────────────────────────────────────────────────────────

const getProductAdmin = wrap(async (req, res) => {
  const r = await db.execute({
    sql: `SELECT p.*, c.name as category_name FROM products p
          LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?`,
    args: [req.params.id]
  })
  const product = r.rows[0]
  if (!product) return res.status(404).json({ error: 'Product niet gevonden.' })

  const images   = await db.execute({ sql: 'SELECT * FROM product_images   WHERE product_id = ? ORDER BY sort_order', args: [product.id] })
  const variants = await db.execute({ sql: 'SELECT * FROM product_variants WHERE product_id = ? ORDER BY id',         args: [product.id] })
  res.json({ ...product, images: images.rows, variants: variants.rows })
})

const createProduct = wrap(async (req, res) => {
  const { name, description, price, sale_price, category_id, gender, featured, active, variants, images, school_id, drop_id } = req.body
  if (!name || !price) return res.status(400).json({ error: 'Naam en prijs zijn verplicht.' })

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()
  const r = await db.execute({
    sql: 'INSERT INTO products (name,slug,description,price,sale_price,category_id,gender,featured,active,school_id,drop_id) VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *',
    args: [name, slug, description || null, price, sale_price || null, category_id || null, gender || 'unisex', featured ? 1 : 0, active === false || active === 0 ? 0 : 1, school_id || null, drop_id || null]
  })
  const product = r.rows[0]

  if (images?.length) {
    for (let i = 0; i < images.length; i++) {
      await db.execute({ sql: 'INSERT INTO product_images (product_id,url,sort_order) VALUES (?,?,?)', args: [product.id, images[i], i] })
    }
  }
  if (variants?.length) {
    for (const v of variants) {
      await db.execute({ sql: 'INSERT INTO product_variants (product_id,size,color,stock) VALUES (?,?,?,?)', args: [product.id, v.size, v.color || null, v.stock || 0] })
    }
  }
  res.status(201).json(product)
})

const updateProduct = wrap(async (req, res) => {
  const { id } = req.params
  const { name, description, price, sale_price, category_id, gender, featured, active, school_id, drop_id } = req.body
  if (!name || !price) return res.status(400).json({ error: 'Naam en prijs zijn verplicht.' })
  await db.execute({
    sql: 'UPDATE products SET name=?,description=?,price=?,sale_price=?,category_id=?,gender=?,featured=?,active=?,school_id=?,drop_id=? WHERE id=?',
    args: [name, description || null, price, sale_price || null, category_id || null, gender || 'unisex', featured ? 1 : 0, active === false || active === 0 ? 0 : 1, school_id || null, drop_id || null, id]
  })
  res.json({ message: 'Product bijgewerkt.' })
})

const deleteProduct = wrap(async (req, res) => {
  await db.execute({ sql: 'UPDATE products SET active = 0 WHERE id = ?', args: [req.params.id] })
  res.json({ message: 'Product gedeactiveerd.' })
})

const replaceVariants = wrap(async (req, res) => {
  const { id } = req.params
  const { variants } = req.body
  if (!Array.isArray(variants)) return res.status(400).json({ error: 'Varianten array verwacht.' })

  await db.execute({ sql: 'DELETE FROM product_variants WHERE product_id = ?', args: [id] })
  for (const v of variants) {
    await db.execute({
      sql: 'INSERT INTO product_variants (product_id,size,color,stock) VALUES (?,?,?,?)',
      args: [id, v.size, v.color || null, v.stock || 0]
    })
  }
  res.json({ message: 'Varianten bijgewerkt.' })
})

const replaceImages = wrap(async (req, res) => {
  const { id } = req.params
  const { images } = req.body
  if (!Array.isArray(images)) return res.status(400).json({ error: 'Images array verwacht.' })

  await db.execute({ sql: 'DELETE FROM product_images WHERE product_id = ?', args: [id] })
  for (let i = 0; i < images.length; i++) {
    await db.execute({ sql: 'INSERT INTO product_images (product_id,url,sort_order) VALUES (?,?,?)', args: [id, images[i], i] })
  }
  res.json({ message: 'Afbeeldingen bijgewerkt.' })
})

const updateVariantStock = wrap(async (req, res) => {
  const { id } = req.params
  const { stock } = req.body
  await db.execute({ sql: 'UPDATE product_variants SET stock = ? WHERE id = ?', args: [stock, id] })
  res.json({ message: 'Voorraad bijgewerkt.' })
})

// ── Categories ────────────────────────────────────────────────────────────────

const createCategory = wrap(async (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Naam is verplicht.' })

  let slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  // Zorg voor unieke slug
  const existing = await db.execute({ sql: 'SELECT id FROM categories WHERE slug = ?', args: [slug] })
  if (existing.rows.length > 0) slug = `${slug}-${Date.now()}`

  const maxR = await db.execute('SELECT MAX(sort_order) as m FROM categories')
  const order = (Number(maxR.rows[0]?.m) || 0) + 1

  const r = await db.execute({
    sql: 'INSERT INTO categories (name,slug,sort_order) VALUES (?,?,?) RETURNING *',
    args: [name.trim(), slug, order]
  })
  res.status(201).json(r.rows[0])
})

const deleteCategory = wrap(async (req, res) => {
  const { id } = req.params
  // Ontkoppel producten in deze categorie eerst
  await db.execute({ sql: 'UPDATE products SET category_id = NULL WHERE category_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [id] })
  res.json({ message: 'Categorie verwijderd.' })
})

const updateCategoryImage = wrap(async (req, res) => {
  const { id }        = req.params
  const { image_url } = req.body
  await db.execute({ sql: 'UPDATE categories SET image_url = ? WHERE id = ?', args: [image_url || null, id] })
  res.json({ message: 'Categorie afbeelding bijgewerkt.' })
})

// ── Homepage settings ──────────────────────────────────────────────────────────

const getHomepageSettings = wrap(async (req, res) => {
  const r        = await db.execute('SELECT key, value FROM homepage_settings')
  const settings = Object.fromEntries(r.rows.map(row => [row.key, row.value]))
  res.json(settings)
})

const updateHomepageSettings = wrap(async (req, res) => {
  const allowed = ['hero_image', 'hero_overline', 'hero_heading', 'hero_cta']
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      await db.execute({
        sql:  'INSERT OR REPLACE INTO homepage_settings (key,value) VALUES (?,?)',
        args: [key, req.body[key]],
      })
    }
  }
  res.json({ message: 'Homepage instellingen opgeslagen.' })
})

// ── Stats ─────────────────────────────────────────────────────────────────────

const adminStats = wrap(async (req, res) => {
  const [ordersR, productsR, usersR, revenueR] = await Promise.all([
    db.execute('SELECT COUNT(*) as cnt FROM orders'),
    db.execute('SELECT COUNT(*) as cnt FROM products WHERE active = 1'),
    db.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'customer'"),
    // Omzet = alleen daadwerkelijk betaalde bestellingen
    db.execute("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE paid_at IS NOT NULL AND status != 'cancelled'"),
  ])
  res.json({
    orders:   Number(ordersR.rows[0].cnt),
    products: Number(productsR.rows[0].cnt),
    users:    Number(usersR.rows[0].cnt),
    revenue:  Number(revenueR.rows[0].total),
  })
})

module.exports = {
  listProducts, getProduct, listCategories,
  getProductAdmin, createProduct, updateProduct, deleteProduct,
  replaceVariants, replaceImages, updateVariantStock,
  createCategory, deleteCategory, updateCategoryImage,
  getHomepageSettings, updateHomepageSettings,
  adminStats,
}
