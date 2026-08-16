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
const ZONE_NAMES = {
  'front-panel': 'front-panel', wrist: 'wrist', general: 'general',
  // Jersey-zones — toegevoegd voor de fight-jersey-configurator, handschoen-
  // zones hierboven blijven ongewijzigd.
  front: 'front', back: 'back', sleeveLeft: 'sleeveLeft', sleeveRight: 'sleeveRight',
}
// Alleen a-z/A-Z/0-9/-/_, max 40 tekens — voorkomt path-traversal via een
// aangepast form-veld (layerId komt ongefilterd van de client).
const LAYER_ID_RE = /^[a-zA-Z0-9_-]{1,40}$/

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'designs', req.params.designId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const kind = KIND_NAMES[req.body.kind] || 'file'
    const zone = ZONE_NAMES[req.body.zone] || 'general'
    // Jersey staat meerdere logo's/teksten per zone toe (anders dan de
    // handschoen, die één vaste zone-naam per bestand had) — layerId maakt
    // de bestandsnaam dan uniek zodat een volgende laag de vorige niet
    // overschrijft. Zonder layerId (handschoen-flow) verandert er niets.
    const layerId = LAYER_ID_RE.test(req.body.layerId || '') ? `-${req.body.layerId}` : ''
    // Origineel behoudt zijn eigen extensie/formaat (nooit hercoderen); bij
    // een ontbrekende/onherkende extensie een neutrale fallback.
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin'
    cb(null, `${kind}-${zone}${layerId}${ext}`)
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
