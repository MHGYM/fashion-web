/**
 * E-mailservice op nodemailer.
 * Zonder SMTP_HOST/SMTP_USER in .env draait alles in dev-modus: mails worden
 * naar de console gelogd zodat de flow lokaal testbaar is zonder mailserver.
 */
const nodemailer = require('nodemailer')
const { APP_URL } = require('../config')

const configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER)
const FROM = () => process.env.SMTP_FROM || 'noreply@fightmarketing.nl'

let transporter = null
if (configured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

/** Basis-layout zodat alle mails er hetzelfde uitzien. */
const layout = (title, body) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <div style="background:#0a0a0a;color:#fff;padding:18px 24px;font-weight:900;letter-spacing:2px;font-size:15px">FIGHTMARKETING</div>
    <div style="padding:24px;border:1px solid #eee;border-top:none">
      <h1 style="font-size:19px;margin:0 0 14px">${title}</h1>
      ${body}
    </div>
    <p style="font-size:11px;color:#999;padding:14px 24px">FightMarketing — hét fight gear platform van Nederland · <a href="${APP_URL}" style="color:#999">${APP_URL.replace(/^https?:\/\//, '')}</a></p>
  </div>`

/** Verstuurt een mail; faalt nooit hard (fire-and-forget vanuit controllers). */
async function send({ to, subject, html }) {
  if (!to) return { skipped: true }
  if (!configured) {
    console.log(`[MAIL:dev] aan=${to} | onderwerp="${subject}"`)
    return { mocked: true }
  }
  try {
    await transporter.sendMail({ from: `FightMarketing <${FROM()}>`, to, subject, html })
    return { sent: true }
  } catch (e) {
    console.error(`[MAIL] verzenden naar ${to} mislukt:`, e.message)
    return { error: e.message }
  }
}

const eur = n => `€${Number(n || 0).toFixed(2)}`

/** Orderbevestiging naar de klant (na geslaagde betaling). */
function orderConfirmation(order, items) {
  const rows = items.map(i =>
    `<tr><td style="padding:6px 0">${i.name} (${i.size}) × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${eur(i.price * i.quantity)}</td></tr>`
  ).join('')
  const discount = Number(order.discount_amount) > 0
    ? `<tr><td style="padding:6px 0;color:#16a34a">Korting (${order.discount_code})</td><td style="padding:6px 0;text-align:right;color:#16a34a">−${eur(order.discount_amount)}</td></tr>` : ''
  return send({
    to: order.shipping_email,
    subject: `Bestelling #${order.id} bevestigd — bedankt!`,
    html: layout(`Bedankt voor je bestelling, ${order.shipping_name.split(' ')[0]}!`, `
      <p style="font-size:14px;line-height:1.6">Je betaling is ontvangen. We gaan voor je aan de slag — je hoort van ons zodra je bestelling onderweg is.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0;border-top:1px solid #eee;border-bottom:1px solid #eee">
        ${rows}${discount}
        <tr><td style="padding:6px 0">Verzending</td><td style="padding:6px 0;text-align:right">${Number(order.shipping_cost) > 0 ? eur(order.shipping_cost) : 'Gratis'}</td></tr>
        <tr><td style="padding:8px 0;font-weight:bold;border-top:1px solid #eee">Totaal</td><td style="padding:8px 0;text-align:right;font-weight:bold;border-top:1px solid #eee">${eur(order.total)}</td></tr>
      </table>
      <p style="font-size:13px;color:#555">Bezorgadres: ${order.shipping_address}, ${order.shipping_postal} ${order.shipping_city}</p>
      <p style="font-size:13px"><a href="${APP_URL}/account" style="color:#111">Bekijk je bestelling in je account →</a></p>
    `),
  })
}

/** Notificatie naar school-admin(s) — zonder klantgegevens (AVG). */
function schoolOrderNotification(emails, school, order) {
  const subject = `Nieuwe bestelling via jouw clubshop — ${eur(order.total)}`
  const html = layout('Nieuwe bestelling in jouw clubshop! 🥊', `
    <p style="font-size:14px;line-height:1.6">
      Er is zojuist een bestelling betaald via de clubshop van <strong>${school.name}</strong>.
    </p>
    <table style="font-size:14px;margin:10px 0">
      <tr><td style="padding:4px 14px 4px 0;color:#888">Bestelling</td><td>#${order.id}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#888">Orderbedrag</td><td>${eur(order.total)}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#888">Jouw commissie</td><td style="font-weight:bold;color:#16a34a">${eur(order.school_commission)}</td></tr>
      ${order.discount_code ? `<tr><td style="padding:4px 14px 4px 0;color:#888">Kortingscode</td><td>${order.discount_code}</td></tr>` : ''}
    </table>
    <p style="font-size:13px;color:#555">Verzending en klantenservice regelt FightMarketing — jij hoeft niets te doen.</p>
    <p style="font-size:13px"><a href="${APP_URL}/dashboard" style="color:#111">Open je clubdashboard →</a></p>
  `)
  return Promise.all([...new Set(emails.filter(Boolean))].map(to => send({ to, subject, html })))
}

/** "Drop is open"-mail naar een ingeschrevene. */
function dropOpen(email, drop) {
  const closes = drop.closes_at
    ? `<p style="font-size:13px;color:#b91c1c;font-weight:bold">Let op: het bestelvenster sluit ${new Date(drop.closes_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} — daarna gaat alles in productie.</p>` : ''
  return send({
    to: email,
    subject: `${drop.name} is nu open! 🥊`,
    html: layout(`${drop.name} is geopend`, `
      <p style="font-size:14px;line-height:1.6">
        De nieuwe collectie${drop.season ? ` voor ${drop.season}` : ''} staat online.
        Bestel nu jouw clubgear voordat het bestelvenster sluit.
      </p>
      ${closes}
      <p style="font-size:13px"><a href="${APP_URL}/scholen" style="display:inline-block;background:#0a0a0a;color:#fff;padding:10px 22px;text-decoration:none;font-weight:bold">Naar de clubshops →</a></p>
    `),
  })
}

/** Wachtwoord-reset link. */
function passwordReset(email, firstName, resetUrl) {
  return send({
    to: email,
    subject: 'Wachtwoord opnieuw instellen',
    html: layout(`Hoi ${firstName || 'daar'},`, `
      <p style="font-size:14px;line-height:1.6">
        Je hebt gevraagd om je wachtwoord opnieuw in te stellen. Klik op de knop
        hieronder — de link is <strong>1 uur</strong> geldig.
      </p>
      <p style="margin:18px 0"><a href="${resetUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:11px 24px;text-decoration:none;font-weight:bold">Nieuw wachtwoord instellen</a></p>
      <p style="font-size:12px;color:#888">Vroeg jij dit niet aan? Dan kun je deze mail negeren — je wachtwoord blijft ongewijzigd.</p>
    `),
  })
}

module.exports = { send, orderConfirmation, schoolOrderNotification, dropOpen, passwordReset, configured }
