import { oAuthDiscoveryMetadata } from 'better-auth/plugins'

import { auth } from '@/lib/server/auth'

// RFC 8414 metadata at the issuer's origin. MCP clients find it from the
// authorization_servers entry in the protected-resource metadata, and it tells
// them where to register, authorize and fetch tokens (/api/auth/mcp/*).
export const GET = oAuthDiscoveryMetadata(auth)
