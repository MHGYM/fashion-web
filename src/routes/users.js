const router = require('express').Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const ctrl = require('../controllers/userAdminController')

// Alles hier is exclusief voor de platform-admin (super-admin)
router.get   ('/admin',     authenticate, requireAdmin, ctrl.list)
router.put   ('/admin/:id', authenticate, requireAdmin, ctrl.update)
router.delete('/admin/:id', authenticate, requireAdmin, ctrl.remove)

module.exports = router
