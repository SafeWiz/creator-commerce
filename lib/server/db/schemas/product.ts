import { integer, pgTable, varchar, numeric } from 'drizzle-orm/pg-core'

export const productsTable = pgTable('products', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  price: numeric().notNull(),
  currency: varchar().notNull()
});
