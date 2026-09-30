import 'server-only'

import { and, count, eq, gte } from 'drizzle-orm'

import db from '@/lib/server/db'
import { aiGenerationsTable, type AiFeature } from '@/lib/server/db/schemas/ai'

/**
 * How many requests to one AI feature the owner started since `since`.
 *
 * Count-then-insert is not atomic, so two requests landing together can both
 * see one under the cap and both proceed. That overshoots by one, which is
 * fine for a cost guard; it is not a quota anyone is billed against.
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
