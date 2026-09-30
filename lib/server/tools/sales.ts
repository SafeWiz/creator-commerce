import 'server-only'

import { z } from 'zod'

import { APP_CURRENCY } from '@/lib/currency'
import {
  getSellerPeriodTotals,
  getSellerRecentSales,
  getSellerTopProducts,
  getSellerTotals,
} from '@/lib/server/dal/purchases'
import { productEditLink } from '@/lib/server/tools/shared'
import { defineTool } from '@/lib/server/tools/types'

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS = { '7d': 7, '30d': 30 } as const
const TOP_PRODUCTS_LIMIT = 5

export const getSalesSummary = defineTool({
  name: 'get_sales_summary',
  description:
    "The user's sales as a seller: units sold and revenue for a period, the same figures for the period before it (for comparison), and their top 5 products by revenue. Paid orders only. Period '7d' or '30d' ends now; 'all' is all time and has no previous period.",
  inputSchema: z.object({
    period: z.enum(['7d', '30d', 'all']).default('30d'),
  }),
  async execute({ userId }, { period }) {
    if (period === 'all') {
      const [totals, top] = await Promise.all([
        getSellerTotals(userId),
        getSellerTopProducts(userId, { limit: TOP_PRODUCTS_LIMIT }),
      ])
      return {
        period,
        currency: APP_CURRENCY,
        current: totals,
        previous: null,
        topProducts: top.map(toTopProduct),
      }
    }

    // The tool reads the clock, not the DAL: the DAL takes both bounds so
    // that the totals and the top products agree on where the window starts.
    const now = Date.now()
    const days = PERIOD_DAYS[period]
    const since = new Date(now - days * DAY_MS)
    const previousSince = new Date(now - 2 * days * DAY_MS)
    const [totals, top] = await Promise.all([
      getSellerPeriodTotals(userId, { since, previousSince }),
      getSellerTopProducts(userId, { since, limit: TOP_PRODUCTS_LIMIT }),
    ])
    return {
      period,
      currency: APP_CURRENCY,
      current: totals.current,
      previous: totals.previous,
      topProducts: top.map(toTopProduct),
    }
  },
})

function toTopProduct(p: { productId: number; name: string; revenueInCents: number }) {
  return {
    productId: p.productId,
    name: p.name,
    revenueInCents: p.revenueInCents,
    editLink: productEditLink(p.productId),
  }
}

export const listRecentSales = defineTool({
  name: 'list_recent_sales',
  description:
    "The user's most recent sales as a seller, newest first: product, price, date and the buyer's name. The full list with totals is on /sales.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(20).default(10),
  }),
  async execute({ userId }, { limit }) {
    const sales = await getSellerRecentSales(userId, limit)
    return {
      currency: APP_CURRENCY,
      sales: sales.map((s) => ({
        productName: s.productName,
        priceInCents: s.priceInCents,
        soldAt: s.createdAt.toISOString(),
        buyerName: s.buyerName,
      })),
      allSalesLink: '/sales',
    }
  },
})
