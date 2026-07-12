require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const helmet   = require('helmet')
const path     = require('path')
const upload   = require('./middleware/upload')
const { authenticate, requireAdmin } = require('./middleware/auth')
const { authLimiter } = require('./middleware/rateLimits')
const { ensureSchema } = require('./schema')
const { APP_URL } = require('./config')

// Fail-fast: zonder geheime sleutel zijn login-tokens vervalsbaar
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET ontbreekt in .env — server start niet.')
  process.exit(1)
}

const app = express()
app.set('trust proxy', 1) // juiste client-IP's achter een reverse proxy (nodig voor rate limits)

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // uploads embedbaar vanaf de site
}))

// CORS: in productie alleen de eigen origins, lokaal alles (Vite-proxy)
const allowedOrigins = [APP_URL, process.env.FRONTEND_URL].filter(Boolean)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
  credentials: true,
}))

app.use(express.json({ limit: '1mb' })) // afbeeldingen gaan via multipart, geen grote JSON nodig
app.use(express.urlencoded({ extended: false })) // Mollie webhook POST form-encoded
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Bruteforce-bescherming op login/registratie
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

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
app.use('/api/users',     require('./routes/users'))
app.use('/api/discounts', require('./routes/discounts'))
app.use('/api/drops',     require('./routes/drops'))
app.use('/api/payments',  require('./routes/payments'))

app.get('/api/health', (_, res) => res.json({ ok: true }))

// 404 voor onbekende API-routes (JSON i.p.v. HTML)
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint niet gevonden.' }))

// Global error handler — must be last. Lekt in productie geen interne details.
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message)
  if (res.headersSent) return next(err)
  const status = err.status || 500
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Interne serverfout.'
    : (err.message || 'Interne serverfout.')
  res.status(status).json({ error: message })
})

const PORT = process.env.PORT || 4000
ensureSchema()
  .then(() => app.listen(PORT, () => console.log(`FightMarketing API draait op poort ${PORT}`)))
  .catch(e => { console.error('Schema fout:', e); process.exit(1) })
