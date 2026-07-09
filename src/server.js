require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const path     = require('path')
const upload   = require('./middleware/upload')
const { authenticate, requireAdmin } = require('./middleware/auth')
const { ensureSchema } = require('./schema')

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false })) // Mollie webhook POST form-encoded
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Image upload endpoint
app.post('/api/upload', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Geen bestand ontvangen.' })
  res.json({ url: `/uploads/${req.file.filename}` })
})

app.use('/api/auth',      require('./routes/auth'))
app.use('/api/products',  require('./routes/products'))
app.use('/api/cart',      require('./routes/cart'))
app.use('/api/orders',    require('./routes/orders'))
app.use('/api/schools',   require('./routes/schools'))
app.use('/api/discounts', require('./routes/discounts'))
app.use('/api/drops',     require('./routes/drops'))
app.use('/api/payments',  require('./routes/payments'))

app.get('/api/health', (_, res) => res.json({ ok: true }))

// Global error handler — must be last
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message)
  if (res.headersSent) return next(err)
  res.status(err.status || 500).json({ error: err.message || 'Interne serverfout.' })
})

const PORT = process.env.PORT || 4000
ensureSchema()
  .then(() => app.listen(PORT, () => console.log(`SeasonFits API draait op poort ${PORT}`)))
  .catch(e => { console.error('Schema fout:', e); process.exit(1) })
