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
 * see room before any of them wrote. A rejected request still leaves its row,
 * which is what "failed attempts count" asks for anyway.
 */
export async function recordGenerationWithinLimit(
  ownerId: string,
  model: string,
  feature: AiFeature,
  { since, limit }: { since: Date; limit: number },
): Promise<boolean> {
  await recordGeneration(ownerId, model, feature)
  return (await countGenerationsSince(ownerId, since, feature)) <= limit
}
