import 'server-only'

import { render } from '@react-email/components'
import type { ReactElement } from 'react'

import { emailFrom, hasCredentials, transporter } from './transport'

/**
 * The one place mail leaves this app.
 *
 * Every caller goes through here, so swapping Gmail for a domain sender, or
 * putting an outbox with retries in front of the send, is a change to this file
 * and transport.ts and to nothing that calls them.
 *
 * Both bodies are rendered from the same element. Multipart is better for
 * deliverability, and it means the console output is the exact text a text-only
 * client would receive rather than a second rendering that could drift from it.
 *
 * Nothing logged here contains SMTP_PASS.
 */
export async function sendEmail(params: {
  to: string
  subject: string
  react: ReactElement
}): Promise<void> {
  const { to, subject, react } = params

  const [html, text] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ])

  await transporter.sendMail({ from: emailFrom, to, subject, html, text })

  if (!hasCredentials) {
    console.log(
      `[email] to=${to} from=${emailFrom}\n[email] subject: ${subject}\n\n${text}`,
    )
  }
}
