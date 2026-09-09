import { Button, Link, Section, Text } from '@react-email/components'

import { EmailLayout } from './layout'

export type VerifyEmailProps = {
  url: string
  name: string
}

export function verifyEmailSubject(): string {
  return 'Confirm your email address'
}

/**
 * Sent on signup, and again whenever someone asks for it from /verify-email.
 *
 * Short on purpose. Verification is not enforced — an unverified account signs
 * in, buys and sells exactly like a verified one — so this asks rather than
 * warns, and promises nothing about what confirming unlocks.
 */
export function VerifyEmail({ url, name }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Confirm your email address">
      <Text className="m-0 text-[20px] font-bold">Confirm your email</Text>
      <Text className="mb-[24px] mt-[8px] text-[14px] text-muted-foreground">
        Hi {name}, confirm this address so we can reach you about your sales and
        purchases.
      </Text>

      <Section>
        <Button
          href={url}
          className="rounded bg-primary px-[20px] py-[12px] text-[14px] font-medium text-primary-foreground"
        >
          Confirm email address
        </Button>
      </Section>

      <Text className="mt-[24px] m-0 text-[12px] text-muted-foreground">
        Or paste this into your browser:{' '}
        <Link href={url} className="text-muted-foreground underline">
          {url}
        </Link>
      </Text>
    </EmailLayout>
  )
}
