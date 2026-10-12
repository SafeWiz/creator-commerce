// Type-only imports from the server tool registry: erased at compile time, so
// nothing server-only reaches the client bundle. Kept in one file so the cards
// never need a value import from lib/server/tools.
import type { getAccountStatus } from "@/lib/server/tools/account"
import type { searchMarketplace } from "@/lib/server/tools/marketplace"
import type { getMyProduct, listMyProducts } from "@/lib/server/tools/products"
import type { listMyDownloads, listMyPurchases } from "@/lib/server/tools/purchases"
import type { getSalesSummary, listRecentSales } from "@/lib/server/tools/sales"

// The shape a tool's `execute` resolves to. What the card actually receives
// is whatever the browser's history holds, so the cards still treat links as
// untrusted (see SafeLink) — the type is a description, not a guarantee.
type Output<T extends { execute(...args: never[]): Promise<unknown> }> = Awaited<
  ReturnType<T["execute"]>
>

export type ListMyProductsOutput = Output<typeof listMyProducts>
export type GetMyProductOutput = Output<typeof getMyProduct>
export type SearchMarketplaceOutput = Output<typeof searchMarketplace>
export type GetSalesSummaryOutput = Output<typeof getSalesSummary>
export type ListRecentSalesOutput = Output<typeof listRecentSales>
export type ListMyPurchasesOutput = Output<typeof listMyPurchases>
export type ListMyDownloadsOutput = Output<typeof listMyDownloads>
export type GetAccountStatusOutput = Output<typeof getAccountStatus>
