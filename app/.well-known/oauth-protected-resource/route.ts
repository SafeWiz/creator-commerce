import { oAuthProtectedResourceMetadata } from 'better-auth/plugins'

import { auth } from '@/lib/server/auth'

// RFC 9728 metadata for /api/mcp. /api/mcp's 401 points clients at Better
// Auth's own copy under /api/auth; this root copy is for clients that probe
// the origin directly.
export const GET = oAuthProtectedResourceMetadata(auth)
