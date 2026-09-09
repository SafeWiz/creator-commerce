import 'server-only'

import {
  PasswordResetEmail,
  passwordResetSubject,
} from '@/components/email/password-reset'
import { VerifyEmail, verifyEmailSubject } from '@/components/email/verify-email'
import { sendEmail } from './send'

/**
 * The two mails Better Auth asks for.
 *
 * Plain awaited composers with no scheduling of their own: Better Auth decides
 * when these run, and advanced.backgroundTasks.handler is where after() is
 * attached. Putting after() here as well would schedule inside a scheduled task.
 *
 * The `user` parameter is deliberately structural rather than Better Auth's User
 * type. These need a name and an address; typing them to the full user would
 * couple two email templates to the auth schema for nothing.
 */
type AuthEmailUser = { name: string; email: string }

export async function sendPasswordResetEmail(data: {
  user: AuthEmailUser
  url: string
}): Promise<void> {
  await sendEmail({
    to: data.user.email,
    subject: passwordResetSubject(),
    react: <PasswordResetEmail url={data.url} name={data.user.name} />,
  })
}

export async function sendEmailVerification(data: {
  user: AuthEmailUser
  url: string
}): Promise<void> {
  await sendEmail({
    to: data.user.email,
    subject: verifyEmailSubject(),
    react: <VerifyEmail url={data.url} name={data.user.name} />,
  })
}
