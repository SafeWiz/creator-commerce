import { Button, Link, Section, Text } from '@react-email/components'

import { EmailLayout } from './layout'

export type PasswordResetEmailProps = {
  url: string
  name: string
}

export function passwordResetSubject(): string {
  return 'Reset your Creator Commerce password'
}

/**
 * The recovery path for a forgotten password.
 *
 * `url` is Better Auth's own, handed to the hook verbatim — it points at
 * /api/auth/reset-password/<token>, which validates before redirecting to the
 * form. Building a url against our own page here would skip that validation and
 * hand an unchecked token to a client component.
 *
 * The expiry is stated because the token really does expire in an hour
 * (resetPasswordTokenExpiresIn's default) and a link that silently stops working
 * reads as a broken app rather than an expired token.
 *
 * The "ignore this" line is the whole security story for an unrequested reset:
 * nothing changes until someone follows the link, so doing nothing is genuinely
 * sufficient and saying so stops a recipient hunting for a button that would
 * "cancel" it.
 */
export function PasswordResetEmail({ url, name }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Text className="m-0 text-[20px] font-bold">Reset your password</Text>
      <Text className="mb-[24px] mt-[8px] text-[14px] text-muted-foreground">
        Hi {name}, someone asked to reset the password on your Creator Commerce
        account. This link works for one hour.
      </Text>

      <Section>
        <Button
          href={url}
          className="rounded bg-primary px-[20px] py-[12px] text-[14px] font-medium text-primary-foreground"
        >
          Choose a new password
        </Button>
      </Section>

      <Text className="mt-[24px] text-[12px] text-muted-foreground">
        If you didn&apos;t ask for this, you can ignore this email — nothing
        changes until the link above is used.
      </Text>

      <Text className="m-0 text-[12px] text-muted-foreground">
        Or paste this into your browser:{' '}
        <Link href={url} className="text-muted-foreground underline">
          {url}
        </Link>
      </Text>
    </EmailLayout>
  )
}
