import 'server-only'

// Relative app paths, so the panel can link them and an MCP adapter can
// absolutize them against appUrl. The shapes match the routes under app/.

export function productEditLink(id: number): string {
  return `/products/${id}`
}

export function storefrontLink(handle: string): string {
  return `/@${handle}`
}

// Works for the owner's drafts too: the owner can preview a draft at its
// public url.
export function productPageLink(handle: string, id: number, slug: string): string {
  return `/@${handle}/${id}/${slug}`
}

// Tool outputs go into a prompt, so free text is cut to a length the answer
// can use. The ellipsis tells the model there was more.
export function truncate(text: string | null, max: number): string | null {
  if (text == null) return null
  return text.length > max ? `${text.slice(0, max)}…` : text
}
