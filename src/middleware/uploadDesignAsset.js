const multer = require('multer')
const path   = require('path')
const fs     = require('fs')
const { UPLOADS_DIR } = require('../config')

/**
 * Losse multer-instantie voor bestanden die bij een 3D-configurator-ontwerp
 * horen (origineel upload / gepositioneerd artwork / glove-preview).
 * Anders dan de generieke /api/upload komt hier per bestand een designId +
 * kind + zone binnen (via de route: :designId in de URL, kind/zone als
 * form-velden vóór het file-veld) zodat alles van één ontwerp bij elkaar in
 * UPLOADS_DIR/designs/<designId>/ terechtkomt — de map die de admin-ZIP later
 * één-op-één overneemt. Bestandsnaam is deterministisch per kind+zone (geen
 * random suffix): een nieuwe upload voor dezelfde zone vervangt bewust de
 * vorige, want alleen de laatste stand van een ontwerp wordt geëxporteerd.
 */

const KIND_NAMES = { original: 'original', artwork: 'artwork', preview: 'preview' }
const ZONE_NAMES = { 'front-panel': 'front-panel', wrist: 'wrist', general: 'general' }

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'designs', req.params.designId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const kind = KIND_NAMES[req.body.kind] || 'file'
    const zone = ZONE_NAMES[req.body.zone] || 'general'
    // Origineel behoudt zijn eigen extensie/formaat (nooit hercoderen); bij
    // een ontbrekende/onherkende extensie een neutrale fallback.
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin'
    cb(null, `${kind}-${zone}${ext}`)
  },
})

module.exports = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('Alleen afbeeldingen zijn toegestaan.'))
  },
})
