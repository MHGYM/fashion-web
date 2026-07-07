const router = require('express').Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const ctrl   = require('../controllers/productController')

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',                   ctrl.listProducts)
router.get('/categories',         ctrl.listCategories)
router.get('/homepage-settings',  ctrl.getHomepageSettings)

// ── Admin stats & homepage (before /:id) ─────────────────────────────────────
router.get('/admin/stats',        authenticate, requireAdmin, ctrl.adminStats)
router.put('/admin/homepage',     authenticate, requireAdmin, ctrl.updateHomepageSettings)
router.get('/admin-detail/:id',   authenticate, requireAdmin, ctrl.getProductAdmin)

// ── Category routes (before /:id to avoid conflicts) ─────────────────────────
router.post  ('/categories',          authenticate, requireAdmin, ctrl.createCategory)
router.delete('/categories/:id',      authenticate, requireAdmin, ctrl.deleteCategory)
router.put   ('/categories/:id/image',authenticate, requireAdmin, ctrl.updateCategoryImage)

// ── Product CRUD (generic /:id last) ─────────────────────────────────────────
router.post  ('/',                authenticate, requireAdmin, ctrl.createProduct)
router.put   ('/:id',             authenticate, requireAdmin, ctrl.updateProduct)
router.delete('/:id',             authenticate, requireAdmin, ctrl.deleteProduct)
router.put   ('/:id/variants',    authenticate, requireAdmin, ctrl.replaceVariants)
router.put   ('/:id/images',      authenticate, requireAdmin, ctrl.replaceImages)
router.put   ('/variants/:id/stock', authenticate, requireAdmin, ctrl.updateVariantStock)

// ── Public product by slug (keep last) ───────────────────────────────────────
router.get('/:slug', ctrl.getProduct)

module.exports = router
