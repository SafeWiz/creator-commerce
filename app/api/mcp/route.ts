import { handleMcp } from '@/lib/server/request/mcp'

// Streamable HTTP uses POST for calls, GET for an optional server stream and
// DELETE to end a session; mcp-handler answers all three.
export const GET = handleMcp
export const POST = handleMcp
export const DELETE = handleMcp

// Tool calls are single bounded DB reads.
export const maxDuration = 30
