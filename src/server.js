require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/auth',     require('./routes/auth'))
app.use('/api/products', require('./routes/products'))
app.use('/api/cart',     require('./routes/cart'))
app.use('/api/orders',   require('./routes/orders'))

app.get('/api/health', (_, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`SummerFits API draait op poort ${PORT}`))
