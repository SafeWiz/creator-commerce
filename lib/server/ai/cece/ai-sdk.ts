import 'server-only'

import { tool, type ToolSet } from 'ai'

import { CECE_TOOLS } from '@/lib/server/tools'
import type { ToolContext } from '@/lib/server/tools/types'

// What the model sees when a tool throws. Deliberately vague: the real error
// may carry SQL or internals, and it would reach both the model and the
// client's copy of the tool part.
const TOOL_FAILURE = {
  error: 'This lookup failed. Tell the user it did not work and suggest trying again later.',
}

/**
 * The tool registry as an AI SDK ToolSet, bound to one user.
 *
 * `ctx` is closed over, so it never appears in a tool's input schema and the
 * model has no way to name another user. `onError` is injected rather than
 * Sentry imported here, so the smoke script can load this module.
 */
export function toAiSdkTools(
  ctx: ToolContext,
  { onError }: { onError: (error: unknown, toolName: string) => void },
): ToolSet {
  return Object.fromEntries(
    CECE_TOOLS.map((t) => [
      t.name,
      tool({
        description: t.description,
        inputSchema: t.inputSchema,
        execute: async (input) => {
          try {
            return await t.execute(ctx, input)
          } catch (error) {
            onError(error, t.name)
            return TOOL_FAILURE
          }
        },
      }),
    ]),
  )
}
