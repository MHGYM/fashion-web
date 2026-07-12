const router = require('express').Router()
const { authenticate, requireAdmin, requireSchool } = require('../middleware/auth')
const ctrl = require('../controllers/schoolController')

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', ctrl.listSchools)

// ── School-dashboard (rol 'school' of admin) ─────────────────────────────────
router.get('/dashboard/me', authenticate, requireSchool, ctrl.dashboard)
router.get('/assortment/me',            authenticate, requireSchool, ctrl.myAssortment)
router.put('/assortment/me/:productId', authenticate, requireSchool, ctrl.toggleAssortment)

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get   ('/admin',                 authenticate, requireAdmin, ctrl.adminListSchools)
router.get   ('/admin/payouts',         authenticate, requireAdmin, ctrl.payouts)
router.get   ('/admin/payouts/export',  authenticate, requireAdmin, ctrl.payoutsExport)
router.post  ('/',                      authenticate, requireAdmin, ctrl.createSchool)
router.put   ('/:id',                   authenticate, requireAdmin, ctrl.updateSchool)
router.delete('/:id',                   authenticate, requireAdmin, ctrl.deleteSchool)
router.post  ('/:id/login',             authenticate, requireAdmin, ctrl.createSchoolLogin)

// ── Public storefront by slug (laatste) ──────────────────────────────────────
router.get('/:slug', ctrl.getStorefront)

module.exports = router
