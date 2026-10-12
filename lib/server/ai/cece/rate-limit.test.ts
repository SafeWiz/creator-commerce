import { describe, it, expect } from 'vitest'
import { APICallError, RetryError } from 'ai'

import { parseRateLimited, rateLimitedErrorText } from '@/lib/cece-errors'

import { rateLimitRetryAfter } from './rate-limit'

function http429(responseHeaders: Record<string, string> = {}) {
    return new APICallError({
        message: 'Too Many Requests',
        url: 'https://ai-gateway.vercel.sh/v3/ai/language-model',
        requestBodyValues: {},
        statusCode: 429,
        responseHeaders,
    })
}

// The shape of AI Gateway's GatewayRateLimitError: a 429 with the HTTP
// response as its cause.
function gatewayRateLimit(message: string, cause = http429()) {
    return Object.assign(new Error(message), { statusCode: 429, cause })
}

function retried(lastError: unknown) {
    return new RetryError({ message: 'Failed after 3 attempts.', reason: 'maxRetriesExceeded', errors: [lastError] })
}

describe('rateLimitRetryAfter', () => {
    it("reads the gateway's message when there is no header", () => {
        // setup
        const error = retried(gatewayRateLimit(
            "Rate limit exceeded for inclusionai/ling-3.1-flash for provider novita: this team's limit of 5 requests per minute (per region) was reached. Retry after 8s.",
        ))

        // run
        const seconds = rateLimitRetryAfter(error)

        // assertions
        expect(seconds).toBe(8)
    })

    it('prefers the retry-after header over the message', () => {
        // setup
        const error = retried(gatewayRateLimit('Retry after 8s.', http429({ 'retry-after': '12' })))

        // run
        const seconds = rateLimitRetryAfter(error)

        // assertions
        expect(seconds).toBe(12)
    })

    it('reads a bare 429 that was not retried', () => {
        // setup
        const error = http429({ 'retry-after-ms': '2500' })

        // run
        const seconds = rateLimitRetryAfter(error)

        // assertions
        expect(seconds).toBe(2.5)
    })

    it('falls back to a default when the 429 says nothing', () => {
        // setup
        const error = retried(gatewayRateLimit('Rate limit exceeded'))

        // run
        const seconds = rateLimitRetryAfter(error)

        // assertions
        expect(seconds).toBe(30)
    })

    it('returns null for anything but a 429', () => {
        // setup
        const error = retried(Object.assign(new Error('Service temporarily unavailable.'), { statusCode: 503 }))

        // run
        const seconds = rateLimitRetryAfter(error)

        // assertions
        expect(seconds).toBeNull()
    })
})

describe('rateLimitedErrorText', () => {
    it('round-trips through parseRateLimited, rounded up', () => {
        // run
        const seconds = parseRateLimited(rateLimitedErrorText(2.5))

        // assertions
        expect(seconds).toBe(3)
    })

    it('leaves other error texts alone', () => {
        // run
        const seconds = parseRateLimited('Cece ran into a problem answering.')

        // assertions
        expect(seconds).toBeNull()
    })
})
