import 'server-only'

import type { McpServer } from '@modelcontextprotocol/server'

import { appUrl } from '@/lib/server/app-url'
import { absolutizeLinks } from '@/lib/server/mcp/links'
import { CECE_TOOLS } from '@/lib/server/tools'
import { TOOL_FAILURE_MESSAGE } from '@/lib/server/tools/shared'
import type { ToolContext } from '@/lib/server/tools/types'

/**
 * Cece's tools on an MCP server, bound to one user.
 *
 * The MCP counterpart of lib/server/ai/cece/ai-sdk.ts: the same registry, the
 * same identity rule (ctx is closed over, never part of an input schema), the
 * same sanitized failure. `onError` is injected so this module never imports
 * request/ or Sentry.
 */
export function registerCeceTools(
  server: McpServer,
  ctx: ToolContext,
  { onError }: { onError: (error: unknown, toolName: string) => void },
): void {
  for (const t of CECE_TOOLS) {
    server.registerTool(
      t.name,
      {
        description: t.description,
        inputSchema: t.inputSchema,
        // Every Cece tool reads and nothing else; clients use this to skip
        // asking the user before each call.
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      async (input) => {
        try {
          const output = await t.execute(ctx, input)
          return {
            content: [
              { type: 'text', text: JSON.stringify(absolutizeLinks(output, appUrl)) },
            ],
          }
        } catch (error) {
          // MCP's own shape for a failed call: the client's model reads the
          // sanitized line, and the original stays on this server.
          onError(error, t.name)
          return { isError: true, content: [{ type: 'text', text: TOOL_FAILURE_MESSAGE }] }
        }
      },
    )
  }
}
