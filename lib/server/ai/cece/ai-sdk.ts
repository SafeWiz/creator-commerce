import 'server-only'

import { tool, type ToolSet } from 'ai'

import { CECE_TOOLS } from '@/lib/server/tools'
import { TOOL_FAILURE_MESSAGE } from '@/lib/server/tools/shared'
import type { ToolContext } from '@/lib/server/tools/types'

// A plain `Error`'s `message` is not an enumerable own property, so
// `JSON.stringify` on it serializes to `{}`. The AI SDK builds the *next*
// step's model input from a thrown tool error via `createToolModelOutput`
// with `errorMode: "json"`, which is exactly `JSON.parse(JSON.stringify(error))`
// — so a plain `throw new Error(...)` would hand the model an empty object in
// the same request, not the message above. `toJSON` is what `JSON.stringify`
// looks for before falling back to enumerable properties, so this keeps the
// one line the model is meant to read.
class ToolFailure extends Error {
  toJSON() {
    return { error: this.message }
  }
}

/**
 * The tool registry as an AI SDK ToolSet, bound to one user.
 *
 * `ctx` is closed over, so it never appears in a tool's input schema and the
 * model has no way to name another user. `onError` is injected rather than
 * Sentry imported here, so the smoke script can load this module.
 *
 * A thrown error is reported through `onError` and then rethrown as a
 * `ToolFailure` — never the original error, which may carry SQL or
 * internals. Rethrowing (rather than returning a value) is what makes the AI
 * SDK treat the call as failed: it becomes a `tool-error` part in
 * `step.content` on the server and an `output-error` tool part on the
 * client, which is what the chip in `cece-message.tsx` keys off to render an
 * X instead of a check. A tool error doesn't end the step loop or the
 * stream, so the model still gets a turn to answer after seeing it — in the
 * same request it sees `{ error: "<TOOL_FAILURE_MESSAGE>" }` (via
 * `ToolFailure.toJSON` above); if the client replays this turn's history on
 * a later request, what comes back is whatever string the route's own
 * `toUIMessageStream({ onError })` chose for the client-visible `errorText`,
 * not this message.
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
            throw new ToolFailure(TOOL_FAILURE_MESSAGE)
          }
        },
      }),
    ]),
  )
}
