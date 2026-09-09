import 'server-only'

import nodemailer from 'nodemailer'

/**
 * One transporter, chosen once at module load.
 *
 * Credentials decide it: both present means Gmail, either missing means the
 * console. A fresh clone with no .env therefore logs instead of throwing, and
 * nothing sends real mail from a dev machine unless someone deliberately pasted
 * real credentials. The accepted cost is that a typo'd variable name in
 * production degrades to console silently.
 *
 * Both branches are nodemailer transporters, which is the point. jsonTransport
 * builds the complete message and hands it back instead of opening a socket, so
 * sendEmail calls sendMail identically either way and never branches on
 * transport.
 *
 * Not pooled. The Gmail handshake costs 1-3s inside a webhook Stripe is timing,
 * and TODO.md already names the outbox as the fix for that; pooling a connection
 * in a per-invocation serverless function would be a false one.
 *
 * service: 'gmail' resolves host, port and TLS from nodemailer's built-in
 * profile. SMTP_PASS is a Google App Password, which requires 2FA on the
 * account — a normal password will be rejected.
 */
export const hasCredentials = Boolean(
  process.env.SMTP_USER && process.env.SMTP_PASS,
)

export const emailFrom =
  process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? 'dev@localhost'

export const transporter = hasCredentials
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true })
