const db = require('../db')
const { bad } = require('../middleware/validate')

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Moet gelijk blijven aan PRICING.nameEmbroiderySurcharge in client/src/customizer/config.js
// (de oude, los toegankelijke SVG-customizer voor o.a. Custom Shin Guards).
const NAME_EMBROIDERY = 10
const CUSTOM_SLUGS = ['custom-gloves', 'custom-shinguards']

// Vaste prijsopbouw voor de bokshandschoen-configurator (3D). Moet exact
// gelijk blijven aan PRICING in client/public/configurator/js/zones.js.
// Bewust NIET afgeleid van products.price: die kolom wordt door de seed in
// schema.js bij elke serverstart teruggezet naar een vaste waarde, dus een
// los aangepast products.price-record zou hier stilzwijgend genegeerd
// worden — deze constante is de daadwerkelijke bron van waarheid voor wat
// een klant betaalt.
const CUSTOM_GLOVE_PRICING = { base: 129.95, customLogo: 12.95, wristName: 12.95 }

/** GET /api/customizer/products — de twee custom producten + maten→variant_id + basisprijs */
const products = wrap(async (req, res) => {
  const out = {}
  for (const slug of CUSTOM_SLUGS) {
    const pR = await db.execute({ sql: 'SELECT id, name, price FROM products WHERE slug = ?', args: [slug] })
    const p = pR.rows[0]
    if (!p) continue
    const vR = await db.execute({ sql: 'SELECT id, size FROM product_variants WHERE product_id = ? ORDER BY id', args: [p.id] })
    const variants = {}
    vR.rows.forEach(v => { variants[v.size] = v.id })
    out[slug] = { id: p.id, name: p.name, price: p.price, variants }
  }
  res.json(out)
})

/**
 * POST /api/customizer/cart — voeg een geconfigureerd item toe.
 * De prijs wordt SERVER-side berekend (basisprijs + evt. embroidered naam),
 * zodat een client geen eigen prijs kan opgeven.
 */
const addToCart = wrap(async (req, res) => {
  const { productKey, size, config } = req.body
  if (!CUSTOM_SLUGS.includes(productKey))       return bad(res, 'Onbekend product.')
  if (!config || typeof config !== 'object')    return bad(res, 'Configuratie ontbreekt.')
  if (!size || typeof size !== 'string')        return bad(res, 'Kies een maat.')

  const pR = await db.execute({ sql: 'SELECT id, price FROM products WHERE slug = ?', args: [productKey] })
  const product = pR.rows[0]
  if (!product) return res.status(404).json({ error: 'Product niet gevonden.' })

  const vR = await db.execute({ sql: 'SELECT id FROM product_variants WHERE product_id = ? AND size = ?', args: [product.id, size] })
  const variant = vR.rows[0]
  if (!variant) return bad(res, 'Ongeldige maat.')

  // Geldt voor beide customizer-varianten: de 3D-configurator zet nooit een
  // `name.style` (daar is een ingevulde naam altijd geborduurd), de oude SVG-
  // customizer wél ('Printed' | 'Embroidered'). Alleen expliciet 'Printed'
  // is dus toeslagvrij; elke andere ingevulde naam (incl. geen style-veld)
  // telt als borduring.
  const embroidered = !!config?.name && config.name.style !== 'Printed'

  let price
  if (productKey === 'custom-gloves') {
    // Eigen logo/afbeelding: 3D-configurator zet customImage en/of
    // wristLogo, de oude SVG-customizer zet logo — één vaste toeslag,
    // ongeacht welke van deze gebruikt is of of er meerdere tegelijk zijn.
    const hasLogo = !!(config?.customImage || config?.wristLogo || config?.logo)
    price = CUSTOM_GLOVE_PRICING.base
      + (hasLogo ? CUSTOM_GLOVE_PRICING.customLogo : 0)
      + (embroidered ? CUSTOM_GLOVE_PRICING.wristName : 0)
  } else {
    price = product.price + (embroidered ? NAME_EMBROIDERY : 0)
  }
  price = Math.round(price * 100) / 100

  const configStr = JSON.stringify(config)
  if (configStr.length > 8000) return bad(res, 'Configuratie te groot.')

  await db.execute({
    sql: 'INSERT INTO custom_cart_items (user_id, product_id, variant_id, config, price, quantity) VALUES (?,?,?,?,?,1)',
    args: [req.user.id, product.id, variant.id, configStr, price],
  })
  res.status(201).json({ message: 'Toegevoegd aan winkelwagen.', price })
})

/** DELETE /api/customizer/cart/:id */
const removeFromCart = wrap(async (req, res) => {
  await db.execute({ sql: 'DELETE FROM custom_cart_items WHERE id = ? AND user_id = ?', args: [req.params.id, req.user.id] })
  res.json({ message: 'Verwijderd.' })
})

module.exports = { products, addToCart, removeFromCart }
