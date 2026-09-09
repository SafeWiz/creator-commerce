import 'server-only'

import { after } from 'next/server'

/**
 * The one place this app calls after().
 *
 * after() defers work until the response has been sent and, on a serverless
 * platform, extends the invocation through waitUntil so the work cannot be torn
 * down half-finished. That last part is the reason it exists here: the receipt
 * used to be a bare un-awaited promise, which a runtime is free to kill the
 * moment it returns the response.
 *
 * It throws outside a request scope, which is what confines this module — and
 * everything else that calls after(), headers(), cookies() or revalidatePath() —
 * to lib/server/request/.
 */

/**
 * Sends after the response, and never lets a send failure escape.
 *
 * The response can no longer be turned into a 500 by this: after() runs the
 * task once the response has already been sent, and Next catches whatever it
 * throws itself — AfterContext.reportTaskError console.errors it and never
 * rethrows (node_modules/next/dist/server/after/after-context.js). So this
 * try/catch is not what keeps a send failure off the response; after() already
 * does that. What it buys instead is a log line that names the order — Next's
 * own catch only prints "A promise passed to `after()` rejected" with no way to
 * tell which one.
 *
 * `context` is whatever identifies the send in a log: the order id, a user id.
 */
export function scheduleEmail(
  task: () => Promise<void>,
  context: string,
): void {
  after(async () => {
    try {
      await task()
    } catch (error) {
      console.error(`[email] ${context} failed`, error)
    }
  })
}

/**
 * Better Auth's advanced.backgroundTasks.handler.
 *
 * Passed a promise rather than a callback, which after() accepts directly. No
 * catch of its own: Better Auth attaches one and logs before it ever calls this
 * (create-context.mjs), so a second would only duplicate the line.
 *
 * Without this wired up, Better Auth awaits its email hooks inline and every
 * signup, reset request and resend blocks on the SMTP handshake.
 */
export function scheduleBackgroundTask(promise: Promise<unknown>): void {
  after(promise)
}
