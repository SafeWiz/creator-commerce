import { index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

import { user } from './auth'

/**
 * One row per "Generate with AI" click, written before the model is called.
 *
 * It exists for the daily cap: counting a user's rows in the last 24h is the
 * whole rate limit. Written before the call so a failing generation still
 * counts — otherwise a broken file could be retried without limit. Cascades
 * with the user, since it is a counter, not a record anyone else relies on.
 */
export const aiGenerationsTable = pgTable(
  'ai_generations',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Which model the click went to, so a change of model shows in the data.
    model: varchar({ length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Serves the cap's count: one owner, recent rows.
    index('ai_generations_ownerId_createdAt_idx').on(table.ownerId, table.createdAt),
  ],
)
