import 'server-only'

import type { z } from 'zod'

/**
 * Who a tool runs for. Filled in by whoever mounts the tools — the Cece route
 * from the session today, an MCP server from its own auth later — and never
 * by the model: no tool input carries a user id.
 */
export type ToolContext = { userId: string }

/**
 * A capability Cece (and later an MCP client) can call.
 *
 * Deliberately not an AI SDK `tool()`: this module imports nothing from `ai`,
 * so the same objects can be registered on an MCP server without unwrapping
 * SDK shapes. `lib/server/ai/cece/ai-sdk.ts` is the one place that adapts them.
 *
 * `name` is snake_case and stable — MCP clients will depend on it. The output
 * must be JSON-serializable and bounded.
 */
export type CeceTool<Schema extends z.ZodType = z.ZodType, Output = unknown> = {
  name: string
  // Written for a model deciding whether to call the tool.
  description: string
  inputSchema: Schema
  // Method syntax on purpose: it makes `input` bivariant, so a tool with a
  // specific input type still fits in CECE_TOOLS's `CeceTool[]`.
  execute(ctx: ToolContext, input: z.output<Schema>): Promise<Output>
}

// Identity at runtime; exists so `execute`'s input is inferred from the
// schema instead of written out twice.
export function defineTool<Schema extends z.ZodType, Output>(
  tool: CeceTool<Schema, Output>,
): CeceTool<Schema, Output> {
  return tool
}
