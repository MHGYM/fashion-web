const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const db     = require('../db')

const sign = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET, { expiresIn: '30d' }
)

const register = async (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body
  if (!email || !password || !first_name || !last_name)
    return res.status(400).json({ error: 'Vul alle verplichte velden in.' })
  const ex = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] })
  if (ex.rows[0]) return res.status(409).json({ error: 'E-mail is al in gebruik.' })
  const hash = await bcrypt.hash(password, 12)
  const r = await db.execute({
    sql: 'INSERT INTO users (email, password, first_name, last_name, phone) VALUES (?,?,?,?,?) RETURNING *',
    args: [email.toLowerCase(), hash, first_name, last_name, phone || null]
  })
  const user = r.rows[0]
  res.status(201).json({ token: sign(user), user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role } })
}

const login = async (req, res) => {
  const { email, password } = req.body
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email?.toLowerCase()] })
  const user = r.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Ongeldig e-mail of wachtwoord.' })
  res.json({ token: sign(user), user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role } })
}

const me = async (req, res) => {
  const r = await db.execute({ sql: 'SELECT id,email,first_name,last_name,phone,address,city,postal_code,country,role FROM users WHERE id = ?', args: [req.user.id] })
  if (!r.rows[0]) return res.status(404).json({ error: 'Niet gevonden.' })
  res.json(r.rows[0])
}

const updateProfile = async (req, res) => {
  const { first_name, last_name, phone, address, city, postal_code, country } = req.body
  await db.execute({
    sql: 'UPDATE users SET first_name=?,last_name=?,phone=?,address=?,city=?,postal_code=?,country=? WHERE id=?',
    args: [first_name, last_name, phone||null, address||null, city||null, postal_code||null, country||'NL', req.user.id]
  })
  res.json({ message: 'Profiel bijgewerkt.' })
}

module.exports = { register, login, me, updateProfile }
