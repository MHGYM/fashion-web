const multer = require('multer')
const path   = require('path')
const fs     = require('fs')
const { UPLOADS_DIR: dir } = require('../config')

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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — ruim genoeg voor een korte hero-video
  fileFilter: (_, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('Alleen afbeeldingen of video\'s zijn toegestaan'))
  }
})
