import { verifyPassword } from 'better-auth/crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { describe, it, expect } from 'vitest'

import { account, user } from '@/lib/server/db/schemas/auth'
import { productsTable } from '@/lib/server/db/schemas/product'
import { purchasesTable } from '@/lib/server/db/schemas/purchase'
import { db } from './db'
import { createSeedScope, SEED_PASSWORD } from './scope'

describe('createSeedScope', () => {
    it('creates a user who can sign in with the seed password', async () => {
        // setup
        const scope = createSeedScope()

        // run
        const seller = await scope.user({ name: 'Seller', emailVerified: true })

        // assertions
        expect(seller.email).toBe(`${scope.tag}-seller-1@example.com`)
        expect(seller.handle).toBe(`${scope.tag}-seller-1`)
        const [row] = await db.select().from(user).where(eq(user.id, seller.id))
        expect(row.emailVerified).toBe(true)
        const [credential] = await db
            .select()
            .from(account)
            .where(and(eq(account.userId, seller.id), eq(account.providerId, 'credential')))
        expect(await verifyPassword({ hash: credential.password!, password: SEED_PASSWORD })).toBe(true)

        await scope.cleanup()
    })

    it('creates a published product with its storefront url', async () => {
        // setup
        const scope = createSeedScope()
        const seller = await scope.user({ name: 'Seller' })

        // run
        const product = await scope.product(seller, { name: 'Field Guide', priceInCents: 1250 })

        // assertions
        expect(product.slug).toBe('field-guide')
        expect(product.url).toBe(`/@${seller.handle}/${product.id}/field-guide`)
        const [row] = await db.select().from(productsTable).where(eq(productsTable.id, product.id))
        expect(row).toMatchObject({ ownerId: seller.id, status: 'published', priceInCents: 1250 })

        await scope.cleanup()
    })

    it('cleanup removes the scope\'s users, their products and their purchases', async () => {
        // setup: a purchase, whose foreign keys restrict deleting either user
        const scope = createSeedScope()
        const other = createSeedScope()
        const seller = await scope.user({ name: 'Seller' })
        const buyer = await scope.user({ name: 'Buyer' })
        const bystander = await other.user({ name: 'Bystander' })
        const product = await scope.product(seller)
        await db.insert(purchasesTable).values({
            orderId: `order-${scope.tag}`,
            buyerId: buyer.id,
            sellerId: seller.id,
            productId: product.id,
            productName: product.name,
            priceInCents: product.priceInCents,
            currency: 'RON',
            status: 'paid',
        })

        // run
        await scope.cleanup()

        // assertions
        const users = await db
            .select({ id: user.id })
            .from(user)
            .where(inArray(user.id, [seller.id, buyer.id, bystander.id]))
        expect(users).toEqual([{ id: bystander.id }])
        expect(await db.select().from(productsTable).where(eq(productsTable.id, product.id))).toEqual([])

        await other.cleanup()
    })
})
