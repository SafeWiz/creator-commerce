import { handleMcp } from '@/lib/server/request/mcp'

// Streamable HTTP uses POST for calls, GET for an optional server stream and
// DELETE to end a session. mcp-handler runs this statelessly — a fresh server
// per request, no session to resume — so only POST does anything; GET and
// DELETE are answered 405 by the SDK itself.
export const GET = handleMcp
export const POST = handleMcp
export const DELETE = handleMcp

// Tool calls are single bounded DB reads.
export const maxDuration = 30
