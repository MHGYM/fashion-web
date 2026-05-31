const db = require('../db')

const getCart = async (req, res) => {
  const r = await db.execute({
    sql: `SELECT ci.id, ci.quantity, ci.variant_id,
            pv.size, pv.color, pv.stock,
            p.id as product_id, p.name, p.slug, p.price, p.sale_price,
            (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image
          FROM cart_items ci
          JOIN product_variants pv ON pv.id = ci.variant_id
          JOIN products p ON p.id = pv.product_id
          WHERE ci.user_id = ?`,
    args: [req.user.id]
  })
  res.json(r.rows)
}

const addToCart = async (req, res) => {
  const { variant_id, quantity = 1 } = req.body
  if (!variant_id) return res.status(400).json({ error: 'variant_id verplicht.' })

  const vr = await db.execute({ sql: 'SELECT * FROM product_variants WHERE id = ?', args: [variant_id] })
  if (!vr.rows[0]) return res.status(404).json({ error: 'Variant niet gevonden.' })
  if (vr.rows[0].stock < quantity) return res.status(400).json({ error: 'Niet genoeg op voorraad.' })

  await db.execute({
    sql: 'INSERT INTO cart_items (user_id,variant_id,quantity) VALUES (?,?,?) ON CONFLICT(user_id,variant_id) DO UPDATE SET quantity = quantity + ?',
    args: [req.user.id, variant_id, quantity, quantity]
  })
  res.status(201).json({ message: 'Toegevoegd aan winkelwagen.' })
}

const updateCartItem = async (req, res) => {
  const { quantity } = req.body
  if (quantity < 1) {
    await db.execute({ sql: 'DELETE FROM cart_items WHERE id = ? AND user_id = ?', args: [req.params.id, req.user.id] })
    return res.json({ message: 'Verwijderd.' })
  }
  await db.execute({ sql: 'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', args: [quantity, req.params.id, req.user.id] })
  res.json({ message: 'Bijgewerkt.' })
}

const removeFromCart = async (req, res) => {
  await db.execute({ sql: 'DELETE FROM cart_items WHERE id = ? AND user_id = ?', args: [req.params.id, req.user.id] })
  res.json({ message: 'Verwijderd.' })
}

const clearCart = async (req, res) => {
  await db.execute({ sql: 'DELETE FROM cart_items WHERE user_id = ?', args: [req.user.id] })
  res.json({ message: 'Winkelwagen leeggemaakt.' })
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart }
