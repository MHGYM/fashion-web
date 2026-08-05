const router = require('express').Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const { runBackup, listBackups, backupFilePath } = require('../backup')

// Alle back-up-endpoints zijn admin-only (bevatten volledige klant-/orderdata).
router.use(authenticate, requireAdmin)

// Lijst met beschikbare snapshots (nieuw → oud)
router.get('/', (req, res) => res.json(listBackups()))

// Nu direct een snapshot maken
router.post('/run', async (req, res) => {
  const r = await runBackup()
  if (r.error) return res.status(500).json(r)
  res.json(r)
})

// Een snapshot downloaden (naam wordt streng gevalideerd tegen pad-traversal)
router.get('/download/:name', (req, res) => {
  const p = backupFilePath(req.params.name)
  if (!p) return res.status(404).json({ error: 'Back-up niet gevonden.' })
  res.download(p)
})

module.exports = router
