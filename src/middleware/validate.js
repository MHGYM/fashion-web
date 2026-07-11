/**
 * Lichtgewicht input-validatiehelpers.
 * Alle queries zijn al geparametriseerd (SQL-injection-veilig); deze helpers
 * bewaken vorm en grenzen van de invoer vóórdat die de database bereikt.
 */

const isEmail = (v) =>
  typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

/** Verplichte niet-lege string met maximumlengte */
const isStr = (v, max = 255) =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max

/** Optionele string (leeg/afwezig mag) met maximumlengte */
const optStr = (v, max = 255) =>
  v === undefined || v === null || v === '' || (typeof v === 'string' && v.length <= max)

/** Geheel getal binnen [min, max] */
const isInt = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(v)
  return Number.isInteger(n) && n >= min && n <= max
}

/** Getal (ook decimalen) binnen [min, max] */
const isNum = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Number(v)
  return typeof n === 'number' && !Number.isNaN(n) && n >= min && n <= max
}

/** Stuurt een 400 met foutmelding; gebruik: return bad(res, '...') */
const bad = (res, message) => res.status(400).json({ error: message })

module.exports = { isEmail, isStr, optStr, isInt, isNum, bad }
