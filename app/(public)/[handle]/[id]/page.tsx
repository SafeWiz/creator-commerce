import { notFound, permanentRedirect } from "next/navigation"

import { productPath, withSearchParams } from "@/lib/paths"

import { findProduct } from "./find-product"

// /@gabi/12 — a product url with the slug left off (hand-typed, or trimmed
// from a shared link). The id alone finds the row, so send it to the one
// canonical url rather than 404ing. Also catches /@gabi/12/: Next strips the
// trailing slash with its own 308 first, which lands here. Nothing renders, so
// there is no metadata; an unknown id is the same 404 as the product page's.
export default async function ProductIdRedirect({
  params,
  searchParams,
}: PageProps<"/[handle]/[id]">) {
  const { handle, id } = await params
  const found = await findProduct(handle, id)
  if (!found) {
    notFound()
  }

  const { user, product } = found
  permanentRedirect(
    withSearchParams(productPath(user.handle, product.id, product.slug), await searchParams),
  )
}
