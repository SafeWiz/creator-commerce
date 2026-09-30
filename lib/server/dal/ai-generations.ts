import 'server-only'

import { and, count, eq, gte } from 'drizzle-orm'

import db from '@/lib/server/db'
import { aiGenerationsTable, type AiFeature } from '@/lib/server/db/schemas/ai'

/**
 * How many requests to one AI feature the owner started since `since`.
 *
 * Callers do not use this to decide whether to proceed — that race belongs
 * to `recordGenerationWithinLimit`, below, which counts only after its own
 * insert is ordered against every other one.
 */
export async function countGenerationsSince(
  ownerId: string,
  since: Date,
  feature: AiFeature,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(aiGenerationsTable)
    .where(
      and(
        eq(aiGenerationsTable.ownerId, ownerId),
        eq(aiGenerationsTable.feature, feature),
        gte(aiGenerationsTable.createdAt, since),
      ),
    )

  return row?.n ?? 0
}

export async function recordGeneration(
  ownerId: string,
  model: string,
  feature: AiFeature,
): Promise<void> {
  await db.insert(aiGenerationsTable).values({ ownerId, model, feature })
}

/**
 * Records one request against an AI feature's cap and reports whether it is
 * within it.
 *
 * Insert first, then count including the new row: inserts are ordered, so
 * the request that makes it the (limit + 1)th sees a count above the limit
 * however many run at once. Counting first would let parallel requests all
 * see room before any of them wrote.
 *
 * A rejected request's row is deleted before returning: a 429 costs the
 * caller nothing, and the window drains instead of a retry at the cap
 * pushing the caller's own reset back forever. Near-simultaneous requests
 * arriving right at the limit may all see a count above it and all reject,
 * letting slightly fewer than `limit` through in that window — the safe
 * direction for a cost guard.
 */
export async function recordGenerationWithinLimit(
  ownerId: string,
  model: string,
  feature: AiFeature,
  { since, limit }: { since: Date; limit: number },
): Promise<boolean> {
  const [inserted] = await db
    .insert(aiGenerationsTable)
    .values({ ownerId, model, feature })
    .returning({ id: aiGenerationsTable.id })

  const withinLimit = (await countGenerationsSince(ownerId, since, feature)) <= limit
  if (!withinLimit) {
    await db.delete(aiGenerationsTable).where(eq(aiGenerationsTable.id, inserted.id))
  }
  return withinLimit
}
