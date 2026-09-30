import 'server-only'

import { getAccountStatus } from '@/lib/server/tools/account'
import { getHelpTopic } from '@/lib/server/tools/help'
import { searchMarketplace } from '@/lib/server/tools/marketplace'
import { getMyProduct, listMyProducts } from '@/lib/server/tools/products'
import { listMyDownloads, listMyPurchases } from '@/lib/server/tools/purchases'
import { getSalesSummary, listRecentSales } from '@/lib/server/tools/sales'
import type { CeceTool } from '@/lib/server/tools/types'

/**
 * Every tool Cece has, and the list a future MCP server registers. Nothing
 * else decides which tools exist.
 *
 * All read-only and all scoped to ToolContext.userId. A tool that writes
 * would need a confirmation step in the panel before it belongs here.
 */
export const CECE_TOOLS: readonly CeceTool[] = [
  getHelpTopic,
  getAccountStatus,
  listMyProducts,
  getMyProduct,
  getSalesSummary,
  listRecentSales,
  listMyPurchases,
  listMyDownloads,
  searchMarketplace,
]
