const router = require('express').Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const ctrl = require('../controllers/dropController')

router.get('/active', ctrl.activeDrop)

router.get   ('/',               authenticate, requireAdmin, ctrl.list)
router.post  ('/',               authenticate, requireAdmin, ctrl.create)
router.put   ('/:id',            authenticate, requireAdmin, ctrl.update)
router.delete('/:id',            authenticate, requireAdmin, ctrl.remove)
router.get   ('/:id/production', authenticate, requireAdmin, ctrl.productionList)

module.exports = router
