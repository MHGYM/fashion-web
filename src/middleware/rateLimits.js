/**
 * Rate limiters — beschermen tegen bruteforce (login), spam-registraties,
 * kortingscode-raden en checkout-misbruik.
 */
const rateLimit = require('express-rate-limit')

const make = (max, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message },
})

module.exports = {
  authLimiter:     make(20,  'Te veel inlogpogingen. Probeer het over 15 minuten opnieuw.'),
  checkoutLimiter: make(30,  'Te veel bestellingen in korte tijd. Probeer het later opnieuw.'),
  codeLimiter:     make(40,  'Te veel codes geprobeerd. Wacht even en probeer het opnieuw.'),
}
