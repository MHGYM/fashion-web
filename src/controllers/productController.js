const db = require('../db')

const listProducts = async (req, res) => {
  const { category, gender, featured, search, sale } = req.query
  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image,
      (SELECT MIN(pv.stock) FROM product_variants pv WHERE pv.product_id = p.id) as min_stock,
      (SELECT SUM(pv.stock) FROM product_variants pv WHERE pv.product_id = p.id) as total_stock
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.active = 1
  `
  const args = []
  if (category) { sql += ` AND c.slug = ?`; args.push(category) }
  if (gender && gender !== 'all') { sql += ` AND (p.gender = ? OR p.gender = 'unisex')`; args.push(gender) }
  if (featured) { sql += ` AND p.featured = 1` }
  if (sale) { sql += ` AND p.sale_price IS NOT NULL` }
  if (search) { sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`; args.push(`%${search}%`, `%${search}%`) }
  sql += ` ORDER BY p.featured DESC, p.created_at DESC`
  const r = await db.execute({ sql, args })
  res.json(r.rows)
}

const getProduct = async (req, res) => {
  const { slug } = req.params
  const r = await db.execute({
    sql: `SELECT p.*, c.name as category_name, c.slug as category_slug
          FROM products p LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.slug = ? AND p.active = 1`,
    args: [slug]
  })
  const product = r.rows[0]
  if (!product) return res.status(404).json({ error: 'Product niet gevonden.' })

  const images = await db.execute({ sql: 'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', args: [product.id] })
  const variants = await db.execute({ sql: 'SELECT * FROM product_variants WHERE product_id = ? ORDER BY size', args: [product.id] })

  res.json({ ...product, images: images.rows, variants: variants.rows })
}

const listCategories = async (req, res) => {
  const r = await db.execute('SELECT * FROM categories ORDER BY sort_order')
  res.json(r.rows)
}

// ── Admin ────────────────────────────────────────────────────────────────────

const createProduct = async (req, res) => {
  const { name, description, price, sale_price, category_id, gender, featured, variants, images } = req.body
  if (!name || !price) return res.status(400).json({ error: 'Naam en prijs zijn verplicht.' })
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now()

  const r = await db.execute({
    sql: 'INSERT INTO products (name,slug,description,price,sale_price,category_id,gender,featured) VALUES (?,?,?,?,?,?,?,?) RETURNING *',
    args: [name, slug, description||null, price, sale_price||null, category_id||null, gender||'unisex', featured?1:0]
  })
  const product = r.rows[0]

  if (images?.length) {
    for (let i = 0; i < images.length; i++) {
      await db.execute({ sql: 'INSERT INTO product_images (product_id,url,sort_order) VALUES (?,?,?)', args: [product.id, images[i], i] })
    }
  }
  if (variants?.length) {
    for (const v of variants) {
      await db.execute({ sql: 'INSERT INTO product_variants (product_id,size,color,stock) VALUES (?,?,?,?)', args: [product.id, v.size, v.color||null, v.stock||0] })
    }
  }
  res.status(201).json(product)
}

const updateProduct = async (req, res) => {
  const { id } = req.params
  const { name, description, price, sale_price, category_id, gender, featured, active } = req.body
  await db.execute({
    sql: 'UPDATE products SET name=?,description=?,price=?,sale_price=?,category_id=?,gender=?,featured=?,active=? WHERE id=?',
    args: [name, description||null, price, sale_price||null, category_id||null, gender||'unisex', featured?1:0, active===false?0:1, id]
  })
  res.json({ message: 'Product bijgewerkt.' })
}

const deleteProduct = async (req, res) => {
  await db.execute({ sql: 'UPDATE products SET active = 0 WHERE id = ?', args: [req.params.id] })
  res.json({ message: 'Product verwijderd.' })
}

const updateVariantStock = async (req, res) => {
  const { id } = req.params
  const { stock } = req.body
  await db.execute({ sql: 'UPDATE product_variants SET stock = ? WHERE id = ?', args: [stock, id] })
  res.json({ message: 'Voorraad bijgewerkt.' })
}

module.exports = { listProducts, getProduct, listCategories, createProduct, updateProduct, deleteProduct, updateVariantStock }
