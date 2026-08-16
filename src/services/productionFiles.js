/**
 * Productiebestanden voor een custom-configurator order-item: een
 * mensleesbare PDF-specificatie + een ZIP-pakket (PDF, glove-preview,
 * origineel klantbestand, gepositioneerd artwork, design-data.json).
 *
 * Kent bewust geen fysieke fabrieksmaten/paneeltemplates — die volgen later
 * per model (Velcro/Lace-Up). Dit bestand leest alleen wat er al is: de
 * config die de 3D-configurator meestuurt (zie configurator.js
 * buildProductionConfig) en, voor oudere bestellingen, de vergelijkbare
 * velden van de losstaande SVG-customizer (CustomizePage.jsx).
 */
const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const { UPLOADS_DIR } = require('../config')

// archiver@8 is ESM-only met een class-API (geen archiver('zip',opts) meer).
// require() van een ESM-package werkt wel op sommige Node-versies (lokaal
// getest op Node 24) maar NIET op Node 20 (o.a. Railway se productieomgeving
// — ERR_REQUIRE_ESM, crashet de hele server bij het laden van deze module).
// Dynamic import() is de enige manier die op alle Node-versies werkt vanuit
// CommonJS; lazy + eenmalig gecachet zodat elke aanroep hem niet opnieuw
// hoeft te laden.
let zipArchiveModulePromise = null
function loadZipArchive() {
  if (!zipArchiveModulePromise) zipArchiveModulePromise = import('archiver').then((m) => m.ZipArchive)
  return zipArchiveModulePromise
}

/** Parseert order_items.custom_config veilig. null bij afwezig/onleesbaar. */
function parseCustomConfig(item) {
  if (!item || !item.custom_config) return null
  try {
    const c = JSON.parse(item.custom_config)
    return c && typeof c === 'object' ? c : null
  } catch (_) { return null }
}

/** Zet een opgeslagen /uploads/...-URL om naar een absoluut pad binnen
 *  UPLOADS_DIR, met padtraversal-bescherming. null als de URL niet
 *  binnen UPLOADS_DIR valt of het bestand niet (meer) bestaat. */
function resolveUploadPath(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) return null
  const root = path.normalize(UPLOADS_DIR)
  const abs = path.normalize(path.join(root, url.slice('/uploads/'.length)))
  if (abs !== root && !abs.startsWith(root + path.sep)) return null
  return fs.existsSync(abs) ? abs : null
}

const euro = (n) => `€ ${Number(n || 0).toFixed(2).replace('.', ',')}`
const fmtDate = (d) => (d ? new Date(d).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/** Bouwt de PDF in het geheugen (geen tijdelijke bestanden nodig). */
function buildProductionSpecPdf(order, item, config) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const c = config || {}
    const designId = c.designId || `order-${order.id}-item-${item.id}`

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000').text('FightMarketing — Productiespecificatie')
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Gegenereerd op ${fmtDate(new Date())}`)
    doc.fillColor('#000')

    const section = (title) => {
      doc.moveDown(0.9)
      doc.fontSize(12).font('Helvetica-Bold').text(title)
      const y = doc.y + 2
      doc.moveTo(doc.x, y).lineTo(545, y).strokeColor('#ddd').stroke()
      doc.moveDown(0.5)
      doc.fontSize(10).font('Helvetica').fillColor('#000')
    }
    const row = (label, value) => {
      doc.font('Helvetica-Bold').text(label, { continued: true, width: 170 })
      doc.font('Helvetica').text(' ' + (value === undefined || value === null || value === '' ? '—' : String(value)))
    }

    section('Identificatie')
    row('Design-ID:', designId)
    row('Bestelnummer:', `#${order.id}`)
    row('Order-item-ID:', item.id)
    row('Besteldatum:', fmtDate(order.created_at))
    row('Status:', order.status)

    section('Klant')
    row('Naam:', order.shipping_name)
    row('E-mail:', order.customer_email || order.shipping_email)
    if (order.shipping_phone) row('Telefoon:', order.shipping_phone)
    row('Adres:', `${order.shipping_address}, ${order.shipping_postal} ${order.shipping_city}`)

    section('Product')
    row('Product:', c.product || item.name)
    row('Model:', c.modelLabel || c.modelProfile || c.style || '—')
    row('Maat:', c.size || item.size || '—')

    // Jersey-config heeft een heel andere vorm dan de handschoen (meerdere
    // zones, elk met een eigen kleur + meerdere logo's/teksten) — eigen
    // secties i.p.v. de handschoen-secties hieronder, die verder ongewijzigd
    // blijven voor bestaande/nieuwe handschoen-bestellingen.
    const jerseyZones = c.zones && typeof c.zones === 'object' ? c.zones : null
    if (jerseyZones) {
      const ZONE_LABELS = { front: 'Voorkant', back: 'Achterkant', sleeveLeft: 'Mouw links', sleeveRight: 'Mouw rechts' }
      section('Kleuren per zone')
      Object.entries(jerseyZones).forEach(([zone, z]) => row((ZONE_LABELS[zone] || zone) + ':', z?.colorHex || '—'))

      section("Logo's")
      let anyLogo = false
      Object.entries(jerseyZones).forEach(([zone, z]) => {
        (z?.logos || []).forEach((logo) => {
          anyLogo = true
          row(`${ZONE_LABELS[zone] || zone}:`, logo.fileName || logo.id)
          if (logo.transform) {
            const t = logo.transform
            row('  Positie / schaal / rotatie:',
              `x=${t.x ?? 0}, y=${t.y ?? 0}, schaal=${Math.round((t.scale ?? 1) * 100)}%, rotatie=${t.rotation ?? 0}°`)
          }
        })
      })
      if (!anyLogo) doc.text('Geen logo\'s gebruikt.')

      section('Tekst')
      let anyText = false
      Object.entries(jerseyZones).forEach(([zone, z]) => {
        (z?.texts || []).forEach((t) => {
          anyText = true
          row(`${ZONE_LABELS[zone] || zone}:`, t.text)
          row('  Kleur / lettertype:', `${t.color || '—'} / ${t.fontFamily || '—'}`)
        })
      })
      if (!anyText) doc.text('Geen tekst toegevoegd.')

      section('Prijs')
      row('In rekening gebracht:', euro(item.price))

      doc.moveDown(1.2)
      doc.fontSize(8).fillColor('#999').text(
        'Dit document maakt deel uit van het productiepakket (ZIP) met de originele geüploade bestanden per zone en de volledige design-data.json.'
      )
      doc.end()
      return
    }

    section('Kleuren')
    const colorEntries = c.colors && typeof c.colors === 'object' ? Object.entries(c.colors) : []
    if (colorEntries.length) colorEntries.forEach(([zone, colorName]) => row(zone + ':', colorName))
    else doc.text('Geen kleurinformatie beschikbaar.')

    section('Eigen logo / afbeelding')
    const frontImage = c.customImage || null
    const wristLogo = c.wristLogo || (c.logo ? { placement: 'Manchet', originalUrl: c.logo.url, artworkUrl: c.logo.url, style: c.logo.style } : null)
    if (!frontImage && !wristLogo) {
      doc.text('Geen eigen logo of afbeelding gebruikt.')
    } else {
      if (frontImage) {
        row('Front Panel:', frontImage.placement || 'Front Panel (incl. duim)')
        if (frontImage.originalFilename) row('  Origineel bestand:', frontImage.originalFilename)
        if (frontImage.transform) {
          const t = frontImage.transform
          row('  Positie / schaal / rotatie:',
            `x=${t.x ?? 0}, y=${t.y ?? 0}, schaal=${Math.round((t.scale ?? 1) * 100)}%, rotatie=${t.rotation ?? 0}°`)
        }
        row('  Bestanden:', (frontImage.originalUrl || frontImage.artworkUrl) ? 'zie original-upload/ en artwork/ in het productiepakket' : 'niet beschikbaar')
      }
      if (wristLogo) {
        row('Manchet-logo:', wristLogo.placement || 'Manchet')
        if (wristLogo.originalFilename) row('  Origineel bestand:', wristLogo.originalFilename)
        row('  Bestanden:', (wristLogo.originalUrl || wristLogo.artworkUrl) ? 'zie original-upload/ en artwork/ in het productiepakket' : 'niet beschikbaar')
      }
    }

    section('Borduring')
    if (c.name) {
      row('Tekst:', c.name.text)
      row('Kleur:', c.name.color)
      if (c.name.font) row('Lettertype:', c.name.font)
      if (c.name.size) row('Grootte:', c.name.size)
      if (c.name.style) row('Stijl:', c.name.style)
    } else {
      doc.text('Geen naam-borduring.')
    }

    section('Prijs')
    row('In rekening gebracht:', euro(item.price))
    if (c.pricing) {
      row('  Basisprijs:', euro(c.pricing.base))
      if (c.pricing.logoSurcharge) row('  Toeslag eigen logo:', euro(c.pricing.logoSurcharge))
      if (c.pricing.embroiderySurcharge) row('  Toeslag borduring:', euro(c.pricing.embroiderySurcharge))
    }

    doc.moveDown(1.2)
    doc.fontSize(8).fillColor('#999').text(
      'Dit document maakt deel uit van het productiepakket (ZIP) met het originele klantbestand, ' +
      'het artwork exact zoals gepositioneerd op de handschoen, en een preview van het eindresultaat.'
    )

    doc.end()
  })
}

/** Streamt de ZIP direct naar de response — geen tijdelijk bestand op schijf. */
async function streamProductionZip(res, order, item, config) {
  const c = config || {}
  const folder = c.designId || `order-${order.id}-item-${item.id}`

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${folder}.zip"`)

  const ZipArchive = await loadZipArchive()
  const archive = new ZipArchive({ zlib: { level: 9 } })
  archive.on('error', (err) => {
    console.error('[ZIP]', err.message)
    if (!res.headersSent) res.status(500).json({ error: 'ZIP-generatie mislukt.' })
    else res.destroy(err)
  })
  archive.pipe(res)

  const pdfBuffer = await buildProductionSpecPdf(order, item, c)
  archive.append(pdfBuffer, { name: `${folder}/production-spec.pdf` })

  archive.append(JSON.stringify({
    designId: c.designId || null,
    order: {
      id: order.id, status: order.status, created_at: order.created_at, total: order.total,
      shipping_name: order.shipping_name, shipping_email: order.customer_email || order.shipping_email,
    },
    item: { id: item.id, name: item.name, size: item.size, price: item.price, quantity: item.quantity },
    design: c,
  }, null, 2), { name: `${folder}/design-data.json` })

  const addIfExists = (url, zipPath) => {
    const abs = resolveUploadPath(url)
    if (abs) archive.file(abs, { name: zipPath })
  }

  // Jersey: elke zone kan meerdere logo's hebben — allemaal apart onder
  // original-uploads/<zone>/, elk met hun eigen bestandsnaam (fileName +
  // layer-id blijft uniek, zie meshSplit/JerseyConfiguratorUI). Handschoen-
  // pad hieronder blijft ongewijzigd voor niet-jersey-config.
  if (c.zones && typeof c.zones === 'object') {
    Object.entries(c.zones).forEach(([zone, z]) => {
      (z?.logos || []).forEach((logo) => {
        if (!logo.originalUrl) return
        const ext = path.extname(logo.originalUrl) || path.extname(logo.fileName || '') || '.bin'
        addIfExists(logo.originalUrl, `${folder}/original-uploads/${zone}/${logo.id}${ext}`)
      })
    })
    await archive.finalize()
    return
  }

  addIfExists(c.glovePreviewUrl, `${folder}/glove-preview${c.glovePreviewUrl ? (path.extname(c.glovePreviewUrl) || '.png') : '.png'}`)

  const frontImage = c.customImage
  if (frontImage?.originalUrl) addIfExists(frontImage.originalUrl, `${folder}/original-upload/front-panel${path.extname(frontImage.originalUrl)}`)
  if (frontImage?.artworkUrl)  addIfExists(frontImage.artworkUrl,  `${folder}/artwork/front-panel-artwork${path.extname(frontImage.artworkUrl) || '.png'}`)

  const wristLogo = c.wristLogo || (c.logo ? { originalUrl: c.logo.url, artworkUrl: c.logo.url } : null)
  if (wristLogo?.originalUrl) addIfExists(wristLogo.originalUrl, `${folder}/original-upload/wrist-logo${path.extname(wristLogo.originalUrl)}`)
  // Legacy SVG-customizer-items hebben maar één URL (geen apart gepositioneerd
  // artwork) — die dan niet nogmaals als "artwork" toevoegen.
  if (wristLogo?.artworkUrl && wristLogo.artworkUrl !== wristLogo.originalUrl) {
    addIfExists(wristLogo.artworkUrl, `${folder}/artwork/wrist-logo-artwork${path.extname(wristLogo.artworkUrl) || '.png'}`)
  }

  await archive.finalize()
}

module.exports = { parseCustomConfig, resolveUploadPath, buildProductionSpecPdf, streamProductionZip }
