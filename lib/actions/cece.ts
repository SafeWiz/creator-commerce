'use server'

import { z } from 'zod'

import { getVisibleProductCovers } from '@/lib/server/dal/products'
import { getUser } from '@/lib/server/request/session'

// The largest list any Cece tool returns (list_my_products, list_my_downloads).
const MAX_COVER_IDS = 25

const idsSchema = z.array(z.number().int().positive()).max(MAX_COVER_IDS)

/**
 * Cover images for the products a Cece card shows. Tool outputs carry ids,
 * never image urls: the model has no use for them, and the history they live
 * in is held by the browser, so a url read from it would be one the client
 * chose. Here the server decides which url each id gets.
 *
 * getUser(), not requireUser(): the panel only renders in the dashboard, and a
 * card whose session expired should fall back to placeholders, not redirect
 * the page from under the user.
 */
export async function getProductCoversAction(
  ids: number[],
): Promise<Record<number, string | null>> {
  const user = await getUser()
  if (!user) return {}

  const parsed = idsSchema.safeParse(ids)
  if (!parsed.success) return {}

  const covers = await getVisibleProductCovers(user.id, [...new Set(parsed.data)])
  return Object.fromEntries(covers)
}
