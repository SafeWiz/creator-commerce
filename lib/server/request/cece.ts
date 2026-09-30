import 'server-only'

import * as Sentry from '@sentry/nextjs'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type ModelMessage,
  type UIMessage,
} from 'ai'
import { z } from 'zod'

import { toAiSdkTools } from '@/lib/server/ai/cece/ai-sdk'
import {
  CECE_DAILY_MESSAGE_LIMIT,
  CECE_MAX_OUTPUT_TOKENS,
  CECE_MAX_STEPS,
  CECE_MODEL,
  ceceInstructions,
} from '@/lib/server/ai/cece/model'
import { recordGenerationWithinLimit } from '@/lib/server/dal/ai-generations'
import { getUser } from '@/lib/server/request/session'

const DAY_MS = 24 * 60 * 60 * 1000

// The client owns the history (it is not stored), so every limit on it is
// enforced here. Serialized size rather than text length, because a forged
// history can stuff tool outputs as easily as text.
const MAX_MESSAGES = 20
const MAX_HISTORY_CHARS = 100_000
const MAX_QUESTION_CHARS = 2_000

// DefaultChatTransport also sends id, trigger and messageId; zod strips them.
const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  // A path on this app, or dropped. `/\` is excluded with `//` because
  // browsers read both as the start of another host.
  pathname: z
    .string()
    .max(200)
    .regex(/^\/(?![\/\\])\S*$/)
    .optional()
    .catch(undefined),
})

// The client shows these as they are, so they are written for the user.
function fail(message: string, status: number) {
  return new Response(message, { status })
}

function questionText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
}

function report(error: unknown, where: string) {
  console.error(`[cece] ${where}`, error)
  Sentry.captureException(error)
}

/**
 * Streams Cece's answer to the conversation the client sends.
 * Mounted at app/api/cece/route.ts.
 *
 * Nothing is written except the message counter, made before the model is
 * called so that failed answers count too. A forged history can only mislead
 * the user's own chat: every tool re-reads with the session's user id, and no
 * tool writes.
 */
export async function handleCece(request: Request): Promise<Response> {
  const user = await getUser()
  if (!user) return fail('Your session expired. Sign in again.', 401)

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Invalid request.', 400)

  const validated = await safeValidateUIMessages({
    messages: parsed.data.messages.slice(-MAX_MESSAGES),
  })
  if (!validated.success) return fail('Invalid request.', 400)
  const messages = validated.data

  // Instructions are the server's alone.
  if (messages.some((m) => m.role === 'system')) return fail('Invalid request.', 400)

  // The panel only ever sends text, so a part of any other type on a user
  // message is either a stale shape the client never produces, or a crafted
  // one — e.g. a file part whose `url` is not a real URL, which
  // `safeValidateUIMessages` accepts (it only checks the field is a string)
  // and which then throws inside `convertToModelMessages`. Rejecting it here
  // closes the server-side file-URL path in user messages.
  const hasNonTextUserPart = messages.some(
    (m) => m.role === 'user' && m.parts.some((part) => part.type !== 'text'),
  )
  if (hasNonTextUserPart) return fail('Invalid request.', 400)

  // A `file` or `source-*` part on a message of any role — including an
  // assistant-role one a forged history could carry — names a url that
  // `convertToModelMessages` hands straight into the model message. It is
  // the provider, not this server, that would fetch that url; rejecting
  // both part types regardless of role closes that off for every role, not
  // just the user's.
  const hasUnproducedPart = messages.some((m) =>
    m.parts.some((part) => part.type === 'file' || part.type.startsWith('source-')),
  )
  if (hasUnproducedPart) return fail('Invalid request.', 400)

  const last = messages.at(-1)
  if (last?.role !== 'user') return fail('Invalid request.', 400)
  if (questionText(last).length > MAX_QUESTION_CHARS) {
    return fail(`Keep questions under ${MAX_QUESTION_CHARS} characters.`, 400)
  }
  if (JSON.stringify(messages).length > MAX_HISTORY_CHARS) {
    return fail('This conversation is too long. Start a new chat.', 400)
  }

  const tools = toAiSdkTools(
    { userId: user.id },
    { onError: (error, toolName) => report(error, `tool ${toolName} failed`) },
  )

  // Converted before the counter so a history that only looks valid to
  // `safeValidateUIMessages` (e.g. a forged tool part) is a 400 rather than
  // a spent message and an unhandled 500.
  let modelMessages: ModelMessage[]
  try {
    modelMessages = await convertToModelMessages(messages, {
      tools,
      // A Stop pressed mid-tool leaves a call with no result in the history;
      // the model rejects those, so they are dropped.
      ignoreIncompleteToolCalls: true,
    })
  } catch (error) {
    // Client-controlled input rejected before the counter runs — logged, not
    // reported to Sentry, or a client could generate Sentry events for free.
    console.warn('[cece] rejected history', error)
    return fail('Invalid request.', 400)
  }

  const withinLimit = await recordGenerationWithinLimit(user.id, CECE_MODEL, 'cece', {
    since: new Date(Date.now() - DAY_MS),
    limit: CECE_DAILY_MESSAGE_LIMIT,
  })
  if (!withinLimit) {
    return fail("Cece's daily limit is reached. Try again tomorrow.", 429)
  }

  const result = streamText({
    model: CECE_MODEL,
    instructions: ceceInstructions({ pathname: parsed.data.pathname }),
    messages: modelMessages,
    tools,
    stopWhen: isStepCount(CECE_MAX_STEPS),
    maxOutputTokens: CECE_MAX_OUTPUT_TOKENS,
    // Stop, or the client disconnecting, ends the model call too.
    abortSignal: request.signal,
    // Errors after the stream starts cannot become a status code — the 200 is
    // already sent. This is where they get reported instead.
    onError: ({ error }) => report(error, 'generation failed'),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      // What the client sees in place of the real error.
      onError: () => 'Cece ran into a problem answering.',
    }),
  })
}
