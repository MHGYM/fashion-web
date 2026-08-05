const path = require('path')

// ─────────────────────────────────────────────────────────────────────────────
// Productie-startguard.
//
// Beschermt tegen de "verse lege database"-val: als de app in productie tegen
// een EPHEMERAL pad draait (bijv. file:./seasonfits.db in de container) i.p.v.
// het persistente Railway-volume, dan lijkt na élke deploy alle data "gereset".
// Deze guard laat de boot dan HARD falen met een duidelijke melding, i.p.v.
// stilzwijgend een lege database te serveren (en er nieuwe data in te schrijven
// die de volgende deploy weer weg is).
//
// Alleen actief bij NODE_ENV=production. Lokaal/dev doet hij niets.
// ─────────────────────────────────────────────────────────────────────────────

function isEphemeralFilePath(dbUrl, volumeRoot) {
  if (!dbUrl.startsWith('file:')) return false // libsql/Turso remote = prima
  const p = dbUrl.slice('file:'.length)
  if (!p) return true
  if (!path.posix.isAbsolute(p) && !path.win32.isAbsolute(p)) return true // relatief pad = ephemeral
  if (volumeRoot) return !p.startsWith(volumeRoot)                          // absoluut maar niet op het volume
  return false
}

function checkEnv(env = process.env) {
  const volumeRoot = env.RAILWAY_VOLUME_MOUNT_PATH || null // bv. "/data"
  const problems = []

  const dbUrl = env.DATABASE_URL || ''
  if (!dbUrl) {
    problems.push('DATABASE_URL is niet gezet.')
  } else if (isEphemeralFilePath(dbUrl, volumeRoot)) {
    problems.push(`DATABASE_URL wijst naar een ephemeral pad (${dbUrl})` +
      (volumeRoot ? ` i.p.v. het volume (${volumeRoot}).` : ' — geen persistent volume.'))
  }

  const uploads = env.UPLOADS_DIR || ''
  if (!uploads) {
    problems.push('UPLOADS_DIR is niet gezet — uploads zouden op ephemeral opslag belanden.')
  } else if (volumeRoot && !uploads.startsWith(volumeRoot)) {
    problems.push(`UPLOADS_DIR (${uploads}) staat niet op het volume (${volumeRoot}).`)
  } else if (!volumeRoot && !path.posix.isAbsolute(uploads) && !path.win32.isAbsolute(uploads)) {
    problems.push(`UPLOADS_DIR (${uploads}) is een relatief/ephemeral pad.`)
  }

  return problems
}

function guardEnv() {
  if (process.env.NODE_ENV !== 'production') return
  const problems = checkEnv()
  if (!problems.length) return

  console.error('\n============================================================')
  console.error('  START GEBLOKKEERD — persistente opslag niet correct ingesteld')
  console.error('============================================================')
  problems.forEach(p => console.error('  [x] ' + p))
  console.error('\n  In productie MOETEN database en uploads op het Railway-volume')
  console.error('  staan, anders is alle data na een deploy weg. Verwacht:')
  console.error('    DATABASE_URL = file:/data/fightmarketing.db')
  console.error('    UPLOADS_DIR  = /data/uploads')
  console.error('  Zet deze variabelen in Railway (Service > Variables) en deploy')
  console.error('  opnieuw. De server start bewust niet zolang dit niet klopt.\n')
  process.exit(1)
}

module.exports = { guardEnv, checkEnv, isEphemeralFilePath }
