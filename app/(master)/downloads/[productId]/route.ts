import { redirect } from 'next/navigation'
import { NextResponse, type NextRequest } from 'next/server'

import { authPathWithNext } from '@/lib/schemas/auth'
import { getDownloadableProductFile } from '@/lib/server/dal/downloads'
import { getUser } from '@/lib/server/session'
import { signProductFileUrl } from '@/lib/server/uploadthing'

/**
 * A buyer's — or the seller's — download.
 *
 * A route handler that redirects, rather than a page or an action that hands
 * the url to the browser, because that is what bounds the credential's life.
 * The signed url exists only inside this 302: never in the html, never in the
 * rsc payload, never in client javascript. Five minutes is generous for
 * something the browser follows immediately, and nothing else ever holds it.
 *
 * Keyed on productId rather than a purchase id so one route serves both sides.
 * Entitlement is "bought it, or own it", and a seller has no purchase row.
 *
 * Nothing here trusts the page that rendered the link: the entitlement check
 * runs on every click.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/downloads/[productId]'>,
) {
  const { productId: raw } = await ctx.params
  const productId = Number(raw)
  if (!Number.isInteger(productId) || productId <= 0) {
    redirect('/downloads')
  }

  // getUser(), not requireUser(): the default post-auth path is not where
  // someone who clicked a download belongs.
  const user = await getUser()
  if (!user) {
    redirect(authPathWithNext('/login', '/downloads'))
  }

  // One null for "no such product", "not yours" and "no file" alike, answered
  // with one redirect for the same reason — see the dal.
  const file = await getDownloadableProductFile(productId, user.id)
  if (!file) {
    redirect('/downloads')
  }

  // redirect('/downloads') rather than a 404 above: this route is only ever
  // reached by a top-level `<a>` navigation, so a bare 404 response renders a
  // blank document at a url with no page behind it — Back is the only way out.
  // /downloads is the one target for every failure case, bad input included,
  // so a prober watching where they land still learns nothing about which
  // product ids exist or who owns them; a query string or flash message would
  // give that back.
  //
  // no-store is belt and braces. A 302 is not cacheable by default, but nothing
  // about a response carrying a credential should ever be stored.
  return NextResponse.redirect(await signProductFileUrl(file.fileKey), {
    status: 302,
    headers: { 'Cache-Control': 'no-store' },
  })
}
