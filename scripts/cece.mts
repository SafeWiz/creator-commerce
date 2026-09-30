/**
 * Asks Cece one question from the terminal, as a given user.
 *
 *   npm run ai:cece -- "How do I publish a product?" --user=<user id>
 *   npm run ai:cece -- "How are my sales this month?" --user=<id> --model=google/gemini-2.5-flash-lite
 *
 * Prints every tool call with its input and a slice of its output, then the
 * answer. It is how CECE_MODEL is chosen, and it proves the tools and the
 * adapter load outside a request — this script cannot load anything that
 * calls headers() or after().
 *
 * `.mts` because `ai` ships as ESM only. A user id comes from the `user`
 * table in Neon.
 */
import { parseArgs } from 'node:util'

import { generateText, isStepCount } from 'ai'

import { toAiSdkTools } from '@/lib/server/ai/cece/ai-sdk'
import {
  CECE_MAX_OUTPUT_TOKENS,
  CECE_MAX_STEPS,
  CECE_MODEL,
  ceceInstructions,
} from '@/lib/server/ai/cece/model'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    user: { type: 'string' },
    model: { type: 'string' },
    pathname: { type: 'string' },
  },
})

const question = positionals.join(' ').trim()
if (!question || !values.user) {
  console.error(
    'Usage: npm run ai:cece -- "<question>" --user=<user id> [--model=<gateway id>] [--pathname=/products]',
  )
  process.exit(1)
}

const model = values.model ?? CECE_MODEL
const tools = toAiSdkTools(
  { userId: values.user },
  { onError: (error, name) => console.error(`[${name}] failed`, error) },
)

const started = Date.now()
const result = await generateText({
  model,
  instructions: ceceInstructions({ pathname: values.pathname }),
  messages: [{ role: 'user', content: question }],
  tools,
  stopWhen: isStepCount(CECE_MAX_STEPS),
  maxOutputTokens: CECE_MAX_OUTPUT_TOKENS,
})

for (const step of result.steps) {
  for (const call of step.toolCalls) {
    console.log(`→ ${call.toolName} ${JSON.stringify(call.input)}`)
  }
  for (const toolResult of step.toolResults) {
    console.log(`  ← ${JSON.stringify(toolResult.output).slice(0, 300)}`)
  }
}

console.log(`\n${result.text}\n`)
console.log(
  `[${model}] ${result.steps.length} step(s), ${Date.now() - started}ms`,
  result.totalUsage,
)
