import nodemailer from 'nodemailer'

// Two ways to send:
// - BREVO_API_KEY: Brevo's HTTPS API. Use this on Render's free tier, which blocks
//   outbound SMTP (ports 25, 465 and 587). The sender (MAIL_FROM) must be a
//   sender verified in Brevo; a plain Gmail address works.
// - SMTP_USER + SMTP_PASS: Gmail SMTP by default (SMTP_PASS = a Google "app
//   password"). Any other SMTP provider works by also setting SMTP_HOST/SMTP_PORT.
const useBrevo = () => !!process.env.BREVO_API_KEY
const useSmtp = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS)
const isConfigured = () => (useBrevo() && !!sender()) || useSmtp()

// Without email in development, codes are printed to the server console instead.
export const canSendEmail = () => isConfigured() || process.env.NODE_ENV !== 'production'

// MAIL_FROM is "Name <address>" or just an address; falls back to SMTP_USER
function sender() {
  const from = (process.env.MAIL_FROM || '').trim()
  const named = from.match(/^(.*?)\s*<([^>]+@[^>]+)>$/)
  if (named) return { name: named[1].trim() || 'ExamPrep', email: named[2].trim() }
  if (from.includes('@')) return { name: 'ExamPrep', email: from }
  return process.env.SMTP_USER ? { name: 'ExamPrep', email: process.env.SMTP_USER } : null
}

// `to` is one address or a list; `replyTo` is optional
async function sendWithBrevo({ to, subject, text, html, replyTo }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      sender: sender(),
      to: [].concat(to).map(email => ({ email })),
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      subject,
      textContent: text,
      htmlContent: html
    }),
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    throw new Error(`Brevo replied ${res.status}: ${detail}`)
  }
}

let transporter = null
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Fail fast instead of hanging when the host blocks SMTP
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    })
  }
  return transporter
}

export async function sendMail({ to, subject, text, html, replyTo }) {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email is not configured on the server (BREVO_API_KEY + MAIL_FROM, or SMTP_USER / SMTP_PASS).')
    }
    console.log(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n${text}\n`)
    return { delivered: false }
  }
  if (useBrevo()) {
    await sendWithBrevo({ to, subject, text, html, replyTo })
  } else {
    const { name, email } = sender()
    await getTransporter().sendMail({ from: `${name} <${email}>`, to: [].concat(to).join(', '), subject, text, html, replyTo })
  }
  return { delivered: true }
}

const PURPOSE_TEXT = {
  signup: { subject: 'Verify your ExamPrep email', line: 'Use this code to finish creating your ExamPrep account:' },
  reset: { subject: 'Reset your ExamPrep password', line: 'Use this code to reset your ExamPrep password:' }
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// `link` (optional) opens the site's form with the code already filled in
export function sendOtpMail(to, code, purpose, minutes, link = null) {
  const { subject, line } = PURPOSE_TEXT[purpose]
  const footer = `The code expires in ${minutes} minutes. If you didn't request it, you can ignore this email.`
  const text = [line, '', code, '', ...(link ? ['Or open this link to set a new password:', link, ''] : []), footer].join('\n')
  const button = link
    ? `<p style="margin:0 0 20px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:8px">Set a new password</a></p>`
    : ''
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 12px">Exam<span style="color:#4f46e5">Prep</span></h2>
      <p>${line}</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0">${code}</p>
      ${button}
      <p style="color:#64748b;font-size:13px">${footer}</p>
    </div>`
  return sendMail({ to, subject: `${subject}: ${code}`, text, html })
}

const REPORT_LABELS = { question: 'Wrong question / answer', bug: 'Bug', suggestion: 'Suggestion', other: 'Other' }

// Tells the developers about a new issue report. Replying goes to the reporter.
// `question` (optional) is the reported question; `link` opens the reports page.
export function sendReportMail(to, report, { question = null, link = null } = {}) {
  const label = REPORT_LABELS[report.category] || report.category
  const reporter = `${report.userName || 'A user'} <${report.userEmail}>`
  const questionLine = question
    ? `Question ${question.id} (GATE ${question.year}${question.set ? ` set ${question.set}` : ''}, ${question.subject})`
    : null
  const excerpt = question?.question ? String(question.question).replace(/\s+/g, ' ').slice(0, 300) : ''

  const text = [
    `New report: ${label}`,
    `From: ${reporter}`,
    ...(questionLine ? [questionLine, excerpt ? `"${excerpt}"` : ''] : []),
    ...(report.page ? [`Page: ${report.page}`] : []),
    '',
    report.message,
    '',
    ...(link ? [`All reports: ${link}`] : []),
    'Reply to this email to answer the reporter.'
  ].join('\n')

  const row = (name, value) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top">${name}</td><td style="padding:4px 0">${value}</td></tr>`
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 4px">Exam<span style="color:#4f46e5">Prep</span> report</h2>
      <p style="margin:0 0 16px;color:#64748b">${escapeHtml(label)}</p>
      <table style="font-size:14px;border-collapse:collapse;margin-bottom:16px">
        ${row('From', escapeHtml(reporter))}
        ${questionLine ? row('Question', escapeHtml(questionLine)) : ''}
        ${report.page ? row('Page', escapeHtml(report.page)) : ''}
      </table>
      ${excerpt ? `<p style="font-size:13px;color:#475569;border-left:3px solid #cbd5e1;padding-left:10px">${escapeHtml(excerpt)}</p>` : ''}
      <p style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">${escapeHtml(report.message)}</p>
      ${link ? `<p><a href="${escapeHtml(link)}" style="color:#4f46e5;font-weight:bold">Open all reports</a></p>` : ''}
      <p style="color:#64748b;font-size:12px">Reply to this email to answer the reporter.</p>
    </div>`

  return sendMail({ to, subject: `[ExamPrep report] ${label}${question ? ` · Q${question.id}` : ''}`, text, html, replyTo: report.userEmail })
}
