const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const upload = require('../middleware/upload')
const designUpload = require('../middleware/uploadDesignAsset')
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

// Ontwerpbestanden van de 3D-configurator (origineel upload / gepositioneerd
// artwork / glove-preview) — één map per designId, zie uploadDesignAsset.js.
// Alleen door de klant zelf gegenereerd bij "In winkelwagen"; het designId
// wordt client-side aangemaakt en reist mee in de config die naar /cart gaat.
const DESIGN_ID_RE = /^FM-[A-Z0-9-]{4,40}$/i
router.post('/design-asset/:designId', authenticate, (req, res) => {
  if (!DESIGN_ID_RE.test(req.params.designId)) return res.status(400).json({ error: 'Ongeldig design-ID.' })
  designUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Bestand te groot (max 50MB).' : (err.message || 'Upload mislukt.') })
    if (!req.file) return res.status(400).json({ error: 'Geen bestand ontvangen.' })
    res.json({ url: `/uploads/designs/${req.params.designId}/${req.file.filename}` })
  })
})

module.exports = router
