import 'server-only'

import { RetryError } from 'ai'

// When the provider says it is rate limiting but not for how long. The
// gateway's limits are per minute.
const DEFAULT_RETRY_AFTER_SECONDS = 30
// A longer wait than this is not worth a countdown in the panel.
const MAX_RETRY_AFTER_SECONDS = 300

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined
}

function secondsFromHeaders(headers: unknown): number | null {
  const h = record(headers)
  const ms = Number(h?.['retry-after-ms'])
  if (Number.isFinite(ms) && ms > 0) return ms / 1000
  const seconds = Number(h?.['retry-after'])
  if (Number.isFinite(seconds) && seconds > 0) return seconds
  return null
}

/**
 * Seconds until the model takes requests again, when `error` is a rate limit
 * (HTTP 429) — otherwise null.
 *
 * The AI SDK has already retried by the time this sees the error, so it is
 * usually a `RetryError` whose last attempt is the 429. AI Gateway's
 * `GatewayRateLimitError` keeps the HTTP response as its `cause`, whose
 * `retry-after` header is read first; failing that, the gateway's message
 * ("... Retry after 8s.") is.
 */
export function rateLimitRetryAfter(error: unknown): number | null {
  const last = record(RetryError.isInstance(error) ? error.lastError : error)
  if (last?.statusCode !== 429) return null

  const seconds =
    secondsFromHeaders(record(last.cause)?.responseHeaders) ??
    secondsFromHeaders(last.responseHeaders) ??
    Number(/retry after (\d+(?:\.\d+)?)\s*s/i.exec(String(last.message))?.[1] ?? NaN)

  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds, MAX_RETRY_AFTER_SECONDS)
    : DEFAULT_RETRY_AFTER_SECONDS
}
