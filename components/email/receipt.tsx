import { Button, Column, Hr, Link, Row, Section, Text } from '@react-email/components'

import { formatPrice } from '@/lib/currency'
import { EmailLayout } from './layout'

export type ReceiptItem = {
  productId: number
  productName: string
  priceInCents: number
}

export type ReceiptEmailProps = {
  orderId: string
  items: ReceiptItem[]
  appUrl: string
}

/**
 * Exported beside the component so the subject and the body cannot drift apart:
 * one import gives a caller both halves of the same email.
 */
export function receiptSubject(): string {
  return 'Your receipt from Creator Commerce'
}

/**
 * What a buyer gets when a checkout is fulfilled.
 *
 * Props are exactly what a purchase row already carries. No join back to
 * products: a purchase is deliberately a snapshot, and a receipt that re-read the
 * product would print a price the buyer never paid and a name they never bought.
 *
 * The per-item links are safe. /downloads/[productId] re-runs the entitlement
 * check on every request and mints its signed url inside the 302, so what travels
 * in the email is a plain url and no credential. Signed out — including a mail
 * scanner prefetching it — the route redirects to login and mints nothing.
 */
export function ReceiptEmail({ orderId, items, appUrl }: ReceiptEmailProps) {
  const total = items.reduce((sum, item) => sum + item.priceInCents, 0)

  return (
    <EmailLayout preview={`Your receipt — ${formatPrice(total)}`}>
      <Text className="m-0 text-[20px] font-bold">Thanks for your purchase</Text>
      <Text className="mb-[24px] mt-[8px] text-[14px] text-muted-foreground">
        Your files are ready. Each product below links straight to its download.
      </Text>

      <Section>
        {items.map((item) => (
          <Row key={item.productId} className="mb-[12px]">
            <Column>
              <Link
                href={`${appUrl}/downloads/${item.productId}`}
                className="text-[14px] font-medium text-foreground underline"
              >
                {item.productName}
              </Link>
            </Column>
            <Column align="right" className="w-[110px] align-top">
              <Text className="m-0 text-[14px]">
                {formatPrice(item.priceInCents)}
              </Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Hr className="my-[20px] border-border" />

      <Row>
        <Column>
          <Text className="m-0 text-[14px] font-bold">Total</Text>
        </Column>
        <Column align="right" className="w-[110px]">
          <Text className="m-0 text-[14px] font-bold">{formatPrice(total)}</Text>
        </Column>
      </Row>

      <Section className="mt-[28px]">
        <Button
          href={`${appUrl}/purchases`}
          className="rounded bg-primary px-[20px] py-[12px] text-[14px] font-medium text-primary-foreground"
        >
          View your purchases
        </Button>
      </Section>

      <Hr className="my-[24px] border-border" />

      <Text className="m-0 text-[12px] text-muted-foreground">
        Order {orderId}
      </Text>
    </EmailLayout>
  )
}
