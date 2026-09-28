import 'server-only'

import { and, count, eq, gte } from 'drizzle-orm'

import db from '@/lib/server/db'
import { aiGenerationsTable } from '@/lib/server/db/schemas/ai'

/**
 * How many generations the owner started since `since`.
 *
 * Count-then-insert is not atomic, so two clicks landing together can both
 * see 19 and both proceed. That overshoots the cap by one, which is fine for
 * a cost guard; it is not a quota anyone is billed against.
 */
export async function countGenerationsSince(
  ownerId: string,
  since: Date,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(aiGenerationsTable)
    .where(
      and(
        eq(aiGenerationsTable.ownerId, ownerId),
        gte(aiGenerationsTable.createdAt, since),
      ),
    )

  return row?.n ?? 0
}

export async function recordGeneration(
  ownerId: string,
  model: string,
): Promise<void> {
  await db.insert(aiGenerationsTable).values({ ownerId, model })
}
