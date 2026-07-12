const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const crypto = require('crypto')
const db     = require('../db')
const email  = require('../services/email')
const { APP_URL } = require('../config')
const { isEmail, isStr, optStr, bad } = require('../middleware/validate')

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const sign = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role, school_id: user.school_id || null },
  process.env.JWT_SECRET, { expiresIn: '30d' }
)

const publicUser = (u) => ({
  id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name,
  role: u.role, school_id: u.school_id || null,
})

const register = wrap(async (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body
  if (!isEmail(email))                 return bad(res, 'Vul een geldig e-mailadres in.')
  if (!isStr(password, 100) || password.length < 8) return bad(res, 'Wachtwoord moet minimaal 8 tekens zijn.')
  if (!isStr(first_name, 60) || !isStr(last_name, 60)) return bad(res, 'Vul je voor- en achternaam in.')
  if (!optStr(phone, 40))              return bad(res, 'Ongeldig telefoonnummer.')

  const ex = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email.toLowerCase()] })
  if (ex.rows[0]) return res.status(409).json({ error: 'E-mail is al in gebruik.' })

  const hash = await bcrypt.hash(password, 12)
  const r = await db.execute({
    sql: 'INSERT INTO users (email, password, first_name, last_name, phone) VALUES (?,?,?,?,?) RETURNING *',
    args: [email.toLowerCase(), hash, first_name.trim(), last_name.trim(), phone || null]
  })
  const user = r.rows[0]
  res.status(201).json({ token: sign(user), user: publicUser(user) })
})

const login = wrap(async (req, res) => {
  const { email, password } = req.body
  if (!isStr(email, 254) || !isStr(password, 100))
    return res.status(401).json({ error: 'Ongeldig e-mail of wachtwoord.' })

  const r = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email.toLowerCase()] })
  const user = r.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Ongeldig e-mail of wachtwoord.' })
  res.json({ token: sign(user), user: publicUser(user) })
})

const me = wrap(async (req, res) => {
  const r = await db.execute({ sql: 'SELECT id,email,first_name,last_name,phone,address,city,postal_code,country,role,school_id FROM users WHERE id = ?', args: [req.user.id] })
  if (!r.rows[0]) return res.status(404).json({ error: 'Niet gevonden.' })
  res.json(r.rows[0])
})

const updateProfile = wrap(async (req, res) => {
  const { first_name, last_name, phone, address, city, postal_code, country } = req.body
  if (!isStr(first_name, 60) || !isStr(last_name, 60)) return bad(res, 'Vul je voor- en achternaam in.')
  if (!optStr(phone, 40) || !optStr(address, 200) || !optStr(city, 120) || !optStr(postal_code, 12) || !optStr(country, 2))
    return bad(res, 'Ongeldige invoer.')

  await db.execute({
    sql: 'UPDATE users SET first_name=?,last_name=?,phone=?,address=?,city=?,postal_code=?,country=? WHERE id=?',
    args: [first_name.trim(), last_name.trim(), phone||null, address||null, city||null, postal_code||null, country||'NL', req.user.id]
  })
  res.json({ message: 'Profiel bijgewerkt.' })
})

/**
 * POST /auth/forgot-password — stuurt een resetlink per mail.
 * Antwoordt altijd hetzelfde, ook bij onbekende adressen (geen account-enumeratie).
 */
const forgotPassword = wrap(async (req, res) => {
  const addr = (req.body.email || '').trim().toLowerCase()
  const generic = { message: 'Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een resetlink.' }
  if (!isEmail(addr)) return res.json(generic)

  const r = await db.execute({ sql: 'SELECT id, email, first_name FROM users WHERE email = ?', args: [addr] })
  const user = r.rows[0]
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    await db.execute({ sql: 'DELETE FROM password_reset_tokens WHERE user_id = ?', args: [user.id] })
    await db.execute({
      sql: `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?,?,datetime('now','+1 hour'))`,
      args: [user.id, token]
    })
    email.passwordReset(user.email, user.first_name, `${APP_URL}/reset-password?token=${token}`).catch(() => {})
  }
  res.json(generic)
})

/** POST /auth/reset-password — { token, password } */
const resetPassword = wrap(async (req, res) => {
  const { token, password } = req.body
  if (!isStr(token, 128)) return bad(res, 'Ongeldige resetlink.')
  if (!isStr(password, 100) || password.length < 8) return bad(res, 'Wachtwoord moet minimaal 8 tekens zijn.')

  const r = await db.execute({
    sql: `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND datetime(expires_at) > datetime('now')`,
    args: [token]
  })
  const reset = r.rows[0]
  if (!reset) return res.status(400).json({ error: 'Deze resetlink is ongeldig of verlopen. Vraag een nieuwe aan.' })

  const hash = await bcrypt.hash(password, 12)
  await db.execute({ sql: 'UPDATE users SET password = ? WHERE id = ?', args: [hash, reset.user_id] })
  await db.execute({ sql: 'UPDATE password_reset_tokens SET used = 1 WHERE id = ?', args: [reset.id] })
  res.json({ message: 'Wachtwoord gewijzigd. Je kunt nu inloggen.' })
})

module.exports = { register, login, me, updateProfile, forgotPassword, resetPassword }
