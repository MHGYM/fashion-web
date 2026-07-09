const router = require('express').Router()
const { authenticate, requireSchool } = require('../middleware/auth')
const ctrl = require('../controllers/discountController')

router.post('/validate', ctrl.validate)

router.get   ('/',    authenticate, requireSchool, ctrl.list)
router.post  ('/',    authenticate, requireSchool, ctrl.create)
router.put   ('/:id', authenticate, requireSchool, ctrl.update)
router.delete('/:id', authenticate, requireSchool, ctrl.remove)

module.exports = router
