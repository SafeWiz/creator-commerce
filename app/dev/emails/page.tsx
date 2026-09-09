import { notFound } from 'next/navigation'

import { TEMPLATES } from './[template]/fixtures'

/**
 * The index, so the slugs do not have to be remembered.
 *
 * notFound() rather than the route handler's literal 404 response, because a
 * page has one available and it renders the app's own not-found.tsx.
 */
export default function DevEmailsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 p-8">
      <h1 className="text-2xl font-medium">Email templates</h1>
      <p className="text-sm text-muted-foreground">
        Append <code>?send=you@example.com</code> to any of these to run the
        template through the real send path.
      </p>
      <ul className="flex flex-col gap-2">
        {Object.entries(TEMPLATES).map(([slug, fixture]) => (
          <li key={slug}>
            <a
              href={`/dev/emails/${slug}`}
              className="text-primary underline"
            >
              {slug}
            </a>
            <span className="ml-2 text-sm text-muted-foreground">
              {fixture.subject}
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}
