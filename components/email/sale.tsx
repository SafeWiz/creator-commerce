import { Button, Column, Hr, Row, Section, Text } from '@react-email/components'

import { formatPrice } from '@/lib/currency'
import { EmailLayout } from './layout'

export type SaleItem = {
  productId: number
  productName: string
  priceInCents: number
}

export type SaleEmailProps = {
  orderId: string
  items: SaleItem[]
  appUrl: string
}

/**
 * Exported beside the component so the subject and the body cannot drift apart,
 * the same arrangement receipt.tsx uses.
 *
 * Takes the count rather than the items because that is all it needs, and a
 * subject that could read a price is a subject that could leak one into a
 * notification preview.
 */
export function saleSubject(itemCount: number): string {
  return itemCount === 1 ? 'You made a sale' : `You made ${itemCount} sales`
}

/**
 * What a seller gets when one of their products is bought.
 *
 * Deliberately carries nothing about the buyer — no name, no address, no id. A
 * seller is told that a sale happened, not who made it; /sales is where that
 * question belongs if it should ever be answerable, and an email that omits it
 * cannot leak it when forwarded.
 *
 * Props are snapshot columns off the purchase row, for the same reason the
 * receipt uses them: a seller who renames or reprices a product afterwards must
 * not have the notification for a past sale rewritten under them.
 *
 * Product names are plain text here, unlike the receipt's download links. A
 * seller's copy of their own product is not something this email needs to hand
 * them, and /sales is one button away.
 */
export function SaleEmail({ orderId, items, appUrl }: SaleEmailProps) {
  const total = items.reduce((sum, item) => sum + item.priceInCents, 0)

  return (
    <EmailLayout preview={`${saleSubject(items.length)} — ${formatPrice(total)}`}>
      <Text className="m-0 text-[20px] font-bold">
        {items.length === 1 ? 'You made a sale' : `You made ${items.length} sales`}
      </Text>
      <Text className="mb-[24px] mt-[8px] text-[14px] text-muted-foreground">
        Payment has been confirmed. Here is what sold.
      </Text>

      <Section>
        {items.map((item) => (
          <Row key={item.productId} className="mb-[12px]">
            <Column>
              <Text className="m-0 text-[14px] font-medium">
                {item.productName}
              </Text>
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
          href={`${appUrl}/sales`}
          className="rounded bg-primary px-[20px] py-[12px] text-[14px] font-medium text-primary-foreground"
        >
          View your sales
        </Button>
      </Section>

      <Hr className="my-[24px] border-border" />

      <Text className="m-0 text-[12px] text-muted-foreground">
        Order {orderId}
      </Text>
    </EmailLayout>
  )
}
