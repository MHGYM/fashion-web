const fs = require('fs')
const path = require('path')
const db = require('./db')

// ─────────────────────────────────────────────────────────────────────────────
// Dagelijkse database-back-up.
//
// Maakt met `VACUUM INTO` een CONSISTENTE snapshot van de live SQLite-database
// naar <db-map>/backups/fightmarketing-YYYY-MM-DD.db en bewaart de laatste 14.
// Draait bij het opstarten en daarna elke 24 uur. Alleen zinvol bij een lokaal/
// volume file:-bestand — bij een remote libsql/Turso-URL regelt de provider dit.
//
// De snapshots staan op hetzelfde volume; download ze periodiek via de admin-
// route (/api/admin/backup) voor een echte off-site kopie.
// ─────────────────────────────────────────────────────────────────────────────

const KEEP = 14
const NAME_RE = /^fightmarketing-\d{4}-\d{2}-\d{2}\.db$/

function getDbFilePath() {
  const url = process.env.DATABASE_URL || 'file:./seasonfits.db'
  if (!url.startsWith('file:')) return null // remote db → geen bestands-back-up
  return url.slice('file:'.length)
}

function backupDir() {
  const dbPath = getDbFilePath()
  return dbPath ? path.join(path.dirname(dbPath), 'backups') : null
}

async function runBackup() {
  const dir = backupDir()
  if (!dir) return { skipped: 'remote-db' }
  try {
    fs.mkdirSync(dir, { recursive: true })
    const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const target = path.join(dir, `fightmarketing-${date}.db`)
    if (fs.existsSync(target)) fs.rmSync(target) // dezelfde dag opnieuw = ververs
    // Forward slashes + escapte quotes voor het SQL-stringliteral (cross-platform)
    const sqlPath = target.replace(/\\/g, '/').replace(/'/g, "''")
    await db.execute(`VACUUM INTO '${sqlPath}'`)
    prune(dir)
    console.log(`[BACKUP] Snapshot gemaakt: ${target}`)
    return { ok: true, file: path.basename(target) }
  } catch (e) {
    console.error('[BACKUP] mislukt:', e.message)
    return { error: e.message }
  }
}

function prune(dir) {
  try {
    const files = fs.readdirSync(dir).filter(f => NAME_RE.test(f)).sort() // oud → nieuw
    for (let i = 0; i < files.length - KEEP; i++) fs.rmSync(path.join(dir, files[i]))
  } catch (_) {}
}

function listBackups() {
  const dir = backupDir()
  if (!dir || !fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => NAME_RE.test(f))
    .sort().reverse() // nieuw → oud
    .map(f => {
      const st = fs.statSync(path.join(dir, f))
      return { name: f, size: st.size, created: st.mtime }
    })
}

/** Vertaalt een back-upnaam naar een veilig pad; weigert pad-traversal. */
function backupFilePath(name) {
  if (!NAME_RE.test(name)) return null
  const dir = backupDir()
  if (!dir) return null
  const p = path.join(dir, name)
  return fs.existsSync(p) ? p : null
}

/** Eenmalig bij start + daarna elke 24 uur. */
function scheduleBackups() {
  runBackup().catch(() => {})
  setInterval(() => runBackup().catch(() => {}), 24 * 60 * 60 * 1000)
}

module.exports = { runBackup, listBackups, backupFilePath, scheduleBackups }
