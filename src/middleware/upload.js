const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

const dir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, dir),
  filename:    (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})

module.exports = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('Alleen afbeeldingen zijn toegestaan'))
  }
})
