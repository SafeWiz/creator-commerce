// The error text of Cece's stream is the only thing the route's `onError` can
// hand the panel: useChat turns it into `new Error(errorText)`. A rate limit
// needs a number on top of the sentence, so it travels as a marked string that
// both halves read through this module.
const RATE_LIMITED = /^cece:rate-limited:(\d+)$/

export function rateLimitedErrorText(retryAfterSeconds: number): string {
  return `cece:rate-limited:${Math.max(1, Math.ceil(retryAfterSeconds))}`
}

/** Seconds to wait when `message` is a rate-limit error text, else null. */
export function parseRateLimited(message: string): number | null {
  const match = RATE_LIMITED.exec(message)
  return match ? Number(match[1]) : null
}
