/**
 * Talks to the model through Vercel AI Gateway, from the terminal.
 *
 *   npm run ai:hello                 # text only
 *   npm run ai:hello -- ./some.pdf   # also sends the file
 *
 * Two jobs. It is the class's first contact with the SDK — one call, one
 * string for the model, no provider SDK. And it is how we check what the
 * models accept before building on them: the gateway lists "File Input"
 * without naming the types, and for Qwen it turned out to mean images only.
 *
 * `.mts` because `ai` ships as ESM only.
 */
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

import { streamText } from 'ai'

// Same split as the app: Qwen reads images but rejects PDFs ("Only image file
// parts are supported"), so PDFs go to Gemini and everything else to Qwen.
const TEXT_AND_IMAGE_MODEL = 'alibaba/qwen3.7-flash'
const PDF_MODEL = 'google/gemini-2.5-flash-lite'

const MEDIA_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

const path = process.argv[2]
const mediaType = path ? MEDIA_TYPES[extname(path).toLowerCase()] : undefined
if (path && !mediaType) {
  console.error(`Unsupported extension: ${extname(path) || '(none)'}`)
  process.exit(1)
}
const MODEL = mediaType === 'application/pdf' ? PDF_MODEL : TEXT_AND_IMAGE_MODEL

const started = Date.now()
let firstTokenAt: number | null = null

const result = streamText({
  model: MODEL,
  messages: [
    {
      role: 'user',
      content:
        path && mediaType
          ? [
              { type: 'text', text: 'Describe this file in two sentences.' },
              { type: 'file', data: await readFile(path), mediaType },
            ]
          : [{ type: 'text', text: 'Say hello to a class learning Next.js, in one sentence.' }],
    },
  ],
})

for await (const chunk of result.textStream) {
  firstTokenAt ??= Date.now()
  process.stdout.write(chunk)
}

console.log(
  `\n\n[${MODEL}] first token after ${firstTokenAt ? firstTokenAt - started : '-'}ms, done after ${Date.now() - started}ms`,
)
console.log('usage', await result.usage)
