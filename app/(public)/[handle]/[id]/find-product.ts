import "server-only"

import { cache } from "react"

import { getStorefrontProduct } from "@/lib/server/dal/products"
import { getUserByHandle } from "@/lib/server/dal/users"
import { getUser } from "@/lib/server/request/session"
import { parseHandleSegment } from "@/lib/utils"

// Resolves the seller from the handle, then the product from that seller, so a
// product is only reachable under the storefront that actually owns it.
// cache()d because generateMetadata and the page both need it in one pass.
// Shared by the product page and the slug-less /@handle/<id> redirect above it.
//
// A draft resolves only for its own seller. Everyone else gets null and the
// page 404s, so a guessed id buys nothing without that seller's session.
export const findProduct = cache(async (handleSegment: string, idSegment: string) => {
  const id = Number(idSegment)
  if (!Number.isInteger(id)) return null

  const user = await getUserByHandle(parseHandleSegment(handleSegment))
  if (!user) return null

  // getUser, not requireUser: the page is public and a signed-out visitor must
  // still get the published product rather than a redirect to /login.
  const viewer = await getUser()
  const product = await getStorefrontProduct(id, user.id, {
    includeDrafts: viewer?.id === user.id,
  })
  return product ? { user, product } : null
})
