const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const upload = require('../middleware/upload')
const ctrl = require('../controllers/customizerController')

router.get('/products', ctrl.products)
router.post('/cart',       authenticate, ctrl.addToCart)
router.delete('/cart/:id', authenticate, ctrl.removeFromCart)

// Logo-upload voor klanten (ingelogd, geen admin nodig) — nette fout bij te groot/verkeerd bestand
router.post('/upload', authenticate, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Bestand te groot (max 50MB).' : (err.message || 'Upload mislukt.') })
    if (!req.file) return res.status(400).json({ error: 'Geen bestand ontvangen.' })
    res.json({ url: `/uploads/${req.file.filename}` })
  })
})

module.exports = router
