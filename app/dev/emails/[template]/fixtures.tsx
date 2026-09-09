import type { ReactElement } from 'react'

import { ReceiptEmail, receiptSubject } from '@/components/email/receipt'
import { SaleEmail, saleSubject } from '@/components/email/sale'

/**
 * Every template the dev preview can render, and the data it renders with.
 *
 * Here rather than beside each template: fixtures exist to exercise a layout —
 * a name long enough to wrap, a zero price — and nothing in production should be
 * able to import them. The route stays free of per-template knowledge, so adding
 * a template is an entry in this record and nothing else.
 */
export type EmailFixture = {
  subject: string
  element: ReactElement
}

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

export const TEMPLATES: Record<string, EmailFixture> = {
  receipt: {
    subject: receiptSubject(),
    element: (
      <ReceiptEmail
        orderId="3f1c0b8e-9d2a-4f77-9a1e-5c6f2b7d8e90"
        appUrl={APP_URL}
        items={[
          {
            productId: 1,
            productName: 'Lightroom Presets — Golden Hour',
            priceInCents: 12900,
          },
          {
            productId: 2,
            productName:
              'A deliberately long product name that has to wrap inside a narrow email column without pushing the price out of alignment',
            priceInCents: 4900,
          },
          { productId: 3, productName: 'Free sample pack', priceInCents: 0 },
        ]}
      />
    ),
  },
  sale: {
    subject: saleSubject(1),
    element: (
      <SaleEmail
        orderId="3f1c0b8e-9d2a-4f77-9a1e-5c6f2b7d8e90"
        appUrl={APP_URL}
        items={[
          {
            productId: 1,
            productName: 'Lightroom Presets — Golden Hour',
            priceInCents: 12900,
          },
        ]}
      />
    ),
  },
  'sale-multi': {
    subject: saleSubject(3),
    element: (
      <SaleEmail
        orderId="7c2e1a4b-8f30-4d19-b6a2-0e5d3c9f1a72"
        appUrl={APP_URL}
        items={[
          {
            productId: 1,
            productName: 'Lightroom Presets — Golden Hour',
            priceInCents: 12900,
          },
          {
            productId: 2,
            productName:
              'A deliberately long product name that has to wrap inside a narrow email column without pushing the price out of alignment',
            priceInCents: 4900,
          },
          { productId: 3, productName: 'Free sample pack', priceInCents: 0 },
        ]}
      />
    ),
  },
}
