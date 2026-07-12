/**
 * Gebruikersbeheer voor de platform-admin (super-admin).
 * Beheert school-logins: aanmaken gebeurt via /schools/:id/login,
 * hier: overzicht, wachtwoord-reset, rol wijzigen en verwijderen.
 *
 * Veiligheidsregels:
 * - Accounts met rol 'admin' zijn via deze API onaantastbaar (geen
 *   privilege-escalatie of lock-out van platform-admins mogelijk).
 * - Je kunt jezelf hier niet aanpassen of verwijderen.
 */
const bcrypt = require('bcryptjs')
const db = require('../db')
const { isStr, isInt, bad } = require('../middleware/validate')

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

/** GET /users/admin — alle school-logins en platform-admins */
const list = wrap(async (req, res) => {
  const r = await db.execute(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.school_id, u.created_at,
           s.name as school_name
    FROM users u LEFT JOIN schools s ON s.id = u.school_id
    WHERE u.role IN ('admin', 'school')
    ORDER BY u.role, u.email`)
  res.json(r.rows)
})

/**
 * PUT /users/admin/:id — { password?, role?, school_id? }
 * - password: nieuw wachtwoord (min. 8 tekens)
 * - role: 'school' of 'customer' (rol resetten / intrekken)
 * - school_id: aan een andere school koppelen (verplicht bij rol 'school')
 */
const update = wrap(async (req, res) => {
  const { password, role, school_id } = req.body
  const targetId = Number(req.params.id)

  const r = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [targetId] })
  const target = r.rows[0]
  if (!target) return res.status(404).json({ error: 'Gebruiker niet gevonden.' })
  if (target.role === 'admin') return res.status(403).json({ error: 'Platform-admins kunnen niet via deze API worden aangepast.' })
  if (targetId === req.user.id) return res.status(403).json({ error: 'Je kunt jezelf hier niet aanpassen.' })

  if (role !== undefined && !['school', 'customer'].includes(role))
    return bad(res, "Rol moet 'school' of 'customer' zijn.")
  if (password !== undefined && (!isStr(password, 100) || password.length < 8))
    return bad(res, 'Wachtwoord moet minimaal 8 tekens zijn.')

  const newRole = role ?? target.role
  let newSchoolId = school_id !== undefined ? (school_id || null) : target.school_id
  if (newRole === 'school') {
    if (!isInt(newSchoolId, 1)) return bad(res, "Kies een school voor een account met rol 'school'.")
    const s = await db.execute({ sql: 'SELECT id FROM schools WHERE id = ?', args: [newSchoolId] })
    if (!s.rows[0]) return bad(res, 'School niet gevonden.')
  } else {
    newSchoolId = null // klant hoort niet aan een school gekoppeld te blijven
  }

  const sets = ['role = ?', 'school_id = ?']
  const args = [newRole, newSchoolId]
  if (password) {
    sets.push('password = ?')
    args.push(await bcrypt.hash(password, 12))
  }
  args.push(targetId)
  await db.execute({ sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`, args })

  res.json({ message: password ? 'Gebruiker bijgewerkt en wachtwoord gereset.' : 'Gebruiker bijgewerkt.' })
})

/** DELETE /users/admin/:id — verwijdert een school-login (alleen rol 'school') */
const remove = wrap(async (req, res) => {
  const targetId = Number(req.params.id)
  const r = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [targetId] })
  const target = r.rows[0]
  if (!target) return res.status(404).json({ error: 'Gebruiker niet gevonden.' })
  if (target.role !== 'school')
    return res.status(403).json({ error: "Alleen accounts met rol 'school' kunnen hier worden verwijderd." })

  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [targetId] })
  res.json({ message: 'School-login verwijderd.' })
})

module.exports = { list, update, remove }
