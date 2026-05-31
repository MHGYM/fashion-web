const jwt = require('jsonwebtoken')

const authenticate = (req, res, next) => {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Niet ingelogd.' })
  try {
    req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET)
    next()
  } catch { res.status(401).json({ error: 'Ongeldige token.' }) }
}

const optionalAuth = (req, res, next) => {
  const h = req.headers.authorization
  if (h?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET) } catch {}
  }
  next()
}

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Geen toegang.' })
  next()
}

module.exports = { authenticate, optionalAuth, requireAdmin }
