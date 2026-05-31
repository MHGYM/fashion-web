const { createClient } = require('@libsql/client')
const db = createClient({ url: process.env.DATABASE_URL || 'file:./summerfits.db' })
module.exports = db
