import 'server-only'

import { z } from 'zod'

import {
  DAILY_GENERATION_LIMIT,
  canReadFile,
  descriptionModelFor,
  streamProductDescription,
} from '@/lib/server/ai/product-description'
import { recordGenerationWithinLimit } from '@/lib/server/dal/ai-generations'
import { getOwnedUpload } from '@/lib/server/dal/products'
import { getUser } from '@/lib/server/request/session'
import { signProductFileUrl } from '@/lib/server/uploadthing'

// `useCompletion` also sends `prompt`; zod's default strips unknown keys.
const bodySchema = z.object({
  fileKey: z.string().min(1).max(255),
  // May be empty: on the create form the file can be picked before the name.
  name: z.string().trim().max(255),
})

const DAY_MS = 24 * 60 * 60 * 1000

// The client shows these as they are, so they are written for the seller.
function fail(message: string, status: number) {
  return new Response(message, { status })
}

/**
 * Streams an AI-written description of one of the caller's uploaded files.
 * Mounted at app/api/products/describe/route.ts.
 *
 * Writes nothing to the product: the text goes to the form, and the seller's
 * Save is what persists it. The one write is the generation counter, made
 * before the model is called so that failed attempts count too.
 */
export async function handleDescribeProduct(request: Request): Promise<Response> {
  const user = await getUser()
  if (!user) return fail('Sign in to generate a description.', 401)

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail('Invalid request.', 400)

  // Another user's key finds nothing, and gets the same answer as a key that
  // never existed.
  const upload = await getOwnedUpload(user.id, parsed.data.fileKey)
  if (!upload) return fail('File not found.', 404)

  // Chosen once, so the row records the model the call actually goes to.
  const model = descriptionModelFor(upload)
  const withinLimit = await recordGenerationWithinLimit(user.id, model, 'describe', {
    since: new Date(Date.now() - DAY_MS),
    limit: DAILY_GENERATION_LIMIT,
  })
  if (!withinLimit) {
    return fail('Daily limit reached. Try again tomorrow.', 429)
  }

  // Signed only when it will be sent. Five minutes, like downloads — far
  // longer than the model needs to fetch it.
  const fileUrl = canReadFile(upload) ? await signProductFileUrl(upload.key) : null

  return streamProductDescription({
    upload,
    productName: parsed.data.name,
    fileUrl,
    model,
    abortSignal: request.signal,
  }).toTextStreamResponse()
}
