import 'server-only'

// Tools return app paths ("/products/12") because Cece's panel links them
// within the app. An MCP client is not inside the app, so a path means nothing
// there. Keys, not values, decide what is a link: every link field in
// lib/server/tools ends in "link" or "Link", and a product name that happens
// to start with "/" must stay as written.
const LINK_KEY = /link$/i

export function absolutizeLinks(value: unknown, base: string): unknown {
  if (Array.isArray(value)) return value.map((item) => absolutizeLinks(item, base))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => [
        key,
        LINK_KEY.test(key) && typeof field === 'string' && field.startsWith('/')
          ? new URL(field, base).href
          : absolutizeLinks(field, base),
      ]),
    )
  }
  return value
}
