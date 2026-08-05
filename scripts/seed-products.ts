import db from '@/lib/server/db'
import { user } from '@/lib/server/db/schemas/auth'
import { productsTable, type ProductStatus } from '@/lib/server/db/schemas/product'
import { slugify } from '@/lib/utils'

// Running this more than once creates duplicates — there's no unique
// constraint on name, so re-running just adds another copy of each row.
const SEED_PRODUCTS: {
  name: string
  description: string
  priceInCents: number
  status: ProductStatus
}[] = [
  {
    name: 'Digital Weekly Planner',
    description: 'A printable weekly planner with goal tracking, habit grids, and a daily schedule layout.',
    priceInCents: 1900,
    status: 'published',
  },
  {
    name: 'Daily Logbook Template',
    description: 'A structured daily logbook for tracking tasks, notes, and progress on ongoing projects.',
    priceInCents: 1500,
    status: 'published',
  },
  {
    name: 'Guided Journal — Reflect & Grow',
    description: 'A guided journaling template with reflection prompts for personal growth.',
    priceInCents: 1200,
    status: 'draft',
  },
]

async function main() {
  const [owner] = await db.select().from(user).limit(1)

  if (!owner) {
    throw new Error(
      'No user found in the database. Sign up or log in once in the app before running the seed.',
    )
  }

  const inserted = await db
    .insert(productsTable)
    .values(
      SEED_PRODUCTS.map((product) => ({
        ...product,
        ownerId: owner.id,
        slug: slugify(product.name),
      })),
    )
    .returning()

  console.log(`Seeded ${inserted.length} product(s) for owner ${owner.id} (${owner.email}):`)
  for (const product of inserted) {
    console.log(`  - #${product.id} ${product.name} (${product.status})`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
