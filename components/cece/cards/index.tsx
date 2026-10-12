"use client"

import { Component, type ReactNode } from "react"

import { AccountStatusCard } from "@/components/cece/cards/account-card"
import {
  MarketplaceCard,
  MyProductCard,
  MyProductsCard,
} from "@/components/cece/cards/product-cards"
import { DownloadsCard, PurchasesCard } from "@/components/cece/cards/purchase-cards"
import { RecentSalesCard, SalesSummaryCard } from "@/components/cece/cards/sales-cards"

// Tool name → card. A tool missing here (get_help_topic, or one added later)
// keeps the status chip. The outputs are typed by the cards themselves; the
// cast is where the untyped tool part meets them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
const CARDS: Record<string, (props: { output: any }) => ReactNode> = {
  list_my_products: MyProductsCard,
  get_my_product: MyProductCard,
  search_marketplace: MarketplaceCard,
  get_sales_summary: SalesSummaryCard,
  list_recent_sales: RecentSalesCard,
  list_my_purchases: PurchasesCard,
  list_my_downloads: DownloadsCard,
  get_account_status: AccountStatusCard,
}

/**
 * A tool output the card can't render — a history from before a field
 * existed, or one edited by hand — falls back to `fallback` (the chip) rather
 * than taking the whole panel down with it.
 */
class CardBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function ToolResultCard({
  toolName,
  output,
  fallback,
}: {
  toolName: string
  output: unknown
  fallback: ReactNode
}) {
  const Card = CARDS[toolName]
  if (!Card || output == null || typeof output !== "object") return fallback
  return (
    <CardBoundary fallback={fallback}>
      <Card output={output} />
    </CardBoundary>
  )
}
