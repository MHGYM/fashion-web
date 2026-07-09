const router = require('express').Router()
const { authenticate } = require('../middleware/auth')
const ctrl = require('../controllers/paymentController')

// Mollie webhook (form-encoded body, geen auth — Mollie roept dit aan)
router.post('/webhook', ctrl.webhook)

// Betaalstatus voor de retourpagina
router.get('/status/:orderId', authenticate, ctrl.orderPaymentStatus)

// Mock-betaalpagina (alleen actief zonder echte Mollie-sleutel)
router.get ('/mock/:paymentId',          ctrl.mockPaymentInfo)
router.post('/mock/:paymentId/complete', ctrl.completeMockPayment)

module.exports = router
