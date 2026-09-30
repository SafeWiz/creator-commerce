import { index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

import { user } from './auth'

// Which AI feature a row counts against. Each has its own daily cap, so
// chatting with Cece never spends a seller's description generations.
export const aiFeatures = ['describe', 'cece'] as const
export type AiFeature = (typeof aiFeatures)[number]

/**
 * One row per AI request, written before the model is called.
 *
 * It exists for the daily caps: counting a user's rows for one feature in the
 * last 24h is the whole rate limit. Written before the call so a failing
 * request still counts — otherwise a broken file could be retried without
 * limit. Cascades with the user, since it is a counter, not a record anyone
 * else relies on.
 *
 * For "Generate with AI" a row is one click; for Cece it is one message sent,
 * however many tool steps the answer takes.
 */
export const aiGenerationsTable = pgTable(
  'ai_generations',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Which model the request went to, so a change of model shows in the data.
    model: varchar({ length: 255 }).notNull(),
    // Defaults to 'describe' because every row written before this column
    // existed was a description generation.
    feature: varchar({ length: 32 }).notNull().default('describe').$type<AiFeature>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Serves the caps' count: one owner, one feature, recent rows.
    index('ai_generations_ownerId_feature_createdAt_idx').on(
      table.ownerId,
      table.feature,
      table.createdAt,
    ),
  ],
)
