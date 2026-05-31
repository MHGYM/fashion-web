const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/authController')
router.post('/register', ctrl.register)
router.post('/login', ctrl.login)
router.get('/me', authenticate, ctrl.me)
router.put('/profile', authenticate, ctrl.updateProfile)
module.exports = router
