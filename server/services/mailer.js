import nodemailer from 'nodemailer'

// Gmail SMTP by default (SMTP_USER = the Gmail address, SMTP_PASS = a Google
// "app password"). Any other SMTP provider works by also setting SMTP_HOST/SMTP_PORT.
const isConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS)

// Without SMTP in development, codes are printed to the server console instead.
export const canSendEmail = () => isConfigured() || process.env.NODE_ENV !== 'production'

let transporter = null
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
  }
  return transporter
}

export async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email is not configured on the server (SMTP_USER / SMTP_PASS).')
    }
    console.log(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n${text}\n`)
    return { delivered: false }
  }
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || `ExamPrep <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html
  })
  return { delivered: true }
}

const PURPOSE_TEXT = {
  signup: { subject: 'Verify your ExamPrep email', line: 'Use this code to finish creating your ExamPrep account:' },
  reset: { subject: 'Reset your ExamPrep password', line: 'Use this code to reset your ExamPrep password:' }
}

export function sendOtpMail(to, code, purpose, minutes) {
  const { subject, line } = PURPOSE_TEXT[purpose]
  const text = `${line}\n\n${code}\n\nThe code expires in ${minutes} minutes. If you didn't request it, you can ignore this email.`
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 12px">Exam<span style="color:#4f46e5">Prep</span></h2>
      <p>${line}</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0">${code}</p>
      <p style="color:#64748b;font-size:13px">The code expires in ${minutes} minutes. If you didn't request it, you can ignore this email.</p>
    </div>`
  return sendMail({ to, subject: `${subject}: ${code}`, text, html })
}
