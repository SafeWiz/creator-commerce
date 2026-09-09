import 'server-only'

import { revalidatePath } from 'next/cache'

/**
 * Invalidates the public storefront pages.
 *
 * Route patterns rather than literal paths, because the callers know the product
 * but not the seller handle the URL is built from.
 *
 * These pages used to read no request state, so Next prerendered them and this
 * was what stopped a stale product list or gallery being served after an edit.
 * That is no longer true: both routes now call getUser() directly to decide
 * whether the viewer is the owner, and the render varies by viewer — the owner
 * sees their own drafts, everyone else doesn't. Reading the session takes both
 * routes out of the Full Route Cache, same as the cart badge's cookies() read
 * did before, so server-side this still invalidates nothing; it only expires
 * the client Router Cache. The routes must stay dynamic on their own terms —
 * a Full Route Cache entry produced during the owner's request would serve
 * their drafts to every visitor, and revalidatePath is not sufficient
 * isolation for a personalized render, so the calls stay for the Router Cache
 * but must never be read as what keeps this safe.
 */
export function revalidateStorefront() {
  revalidatePath('/(public)/[handle]', 'page')
  revalidatePath('/(public)/[handle]/[id]/[slug]', 'page')
}
