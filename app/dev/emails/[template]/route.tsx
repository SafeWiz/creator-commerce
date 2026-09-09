import { render } from '@react-email/components'
import type { NextRequest } from 'next/server'

import { sendEmail } from '@/lib/server/email/send'
import { TEMPLATES } from './fixtures'

/**
 * Looking at an email while building it.
 *
 * A route in the app already running rather than the react-email CLI, which
 * boots its own Next app and expects an emails/ directory at the repo root. This
 * gives the same loop — edit, refresh — for no extra dependency.
 *
 * The route knows nothing about any individual template; fixtures.tsx is the
 * registry.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/dev/emails/[template]'>,
) {
  // Before anything renders. This route exposes fixtures and a send trigger;
  // neither belongs to a deployed app.
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const { template } = await ctx.params
  // TEMPLATES is a plain object literal, so a bare index lookup also resolves
  // inherited members — TEMPLATES['constructor'] or ['toString'] would return
  // one, pass the falsy check below, and reach render(undefined) as a 500
  // instead of the 404 an unknown template should get.
  const fixture = Object.hasOwn(TEMPLATES, template)
    ? TEMPLATES[template]
    : undefined

  if (!fixture) {
    return new Response(
      `Unknown template: ${template}\nKnown: ${Object.keys(TEMPLATES).join(', ')}\n`,
      { status: 404 },
    )
  }

  // ?send=<address> exercises the whole path — render, transport, log — without
  // running a Stripe checkout or a password reset. Dev only, like the rest.
  const to = request.nextUrl.searchParams.get('send')
  if (to) {
    await sendEmail({ to, subject: fixture.subject, react: fixture.element })
    return new Response(`Sent to ${to}\n`)
  }

  const html = await render(fixture.element)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
