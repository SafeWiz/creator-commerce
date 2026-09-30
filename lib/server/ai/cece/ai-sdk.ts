import 'server-only'

import { tool, type ToolSet } from 'ai'

import { CECE_TOOLS } from '@/lib/server/tools'
import type { ToolContext } from '@/lib/server/tools/types'

// What the model sees when a tool throws. Deliberately vague: the real error
// may carry SQL or internals, and it would reach both the model and the
// client's copy of the tool part.
export const TOOL_FAILURE_MESSAGE =
  'This lookup failed. Tell the user it did not work and suggest trying again later.'

/**
 * The tool registry as an AI SDK ToolSet, bound to one user.
 *
 * `ctx` is closed over, so it never appears in a tool's input schema and the
 * model has no way to name another user. `onError` is injected rather than
 * Sentry imported here, so the smoke script can load this module.
 *
 * A thrown error is reported through `onError` and then rethrown as a
 * sanitized `Error` — never the original, which may carry SQL or internals.
 * Rethrowing (rather than returning a value) is what makes the AI SDK treat
 * the call as failed: it becomes a `tool-error` part in `step.content` on the
 * server and an `output-error` tool part on the client, which is what the
 * chip in `cece-message.tsx` keys off to render an X instead of a check. A
 * tool error doesn't end the step loop or the stream, so the model still
 * gets a turn to answer after seeing it.
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
            throw new Error(TOOL_FAILURE_MESSAGE)
          }
        },
      }),
    ]),
  )
}
