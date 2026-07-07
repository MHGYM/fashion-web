const { createClient } = require('@libsql/client')
const db = createClient({ url: process.env.DATABASE_URL || 'file:./seasonfits.db' })
module.exports = db
