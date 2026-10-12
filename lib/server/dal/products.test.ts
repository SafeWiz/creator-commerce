import { eq } from 'drizzle-orm'
import { describe, it, expect } from 'vitest'

import { productsTable } from '@/lib/server/db/schemas/product'
import { purchasesTable } from '@/lib/server/db/schemas/purchase'
import { db } from '@/test/seed/db'
import { useSeedScope } from '@/test/seed/vitest'
import { getVisibleProductCovers, listSitemapEntries } from './products'

// eslint-disable-next-line react-hooks/rules-of-hooks -- Vitest helper named use…, not a React hook
const seed = useSeedScope()

describe('listSitemapEntries', () => {
    it('lists published products with their seller handle, and no drafts or deleted ones', async () => {
        // setup
        const seller = await seed.user({ name: 'Sitemap' })
        const published = await seed.product(seller, { name: `Sitemap Published ${seed.tag}` })
        const draft = await seed.product(seller, { name: `Sitemap Draft ${seed.tag}`, status: 'draft' })
        const deleted = await seed.product(seller, { name: `Sitemap Deleted ${seed.tag}` })
        await db.update(productsTable).set({ deletedAt: new Date() }).where(eq(productsTable.id, deleted.id))

        // run
        const entries = await listSitemapEntries()

        // assertions: other parallel files' rows are in here too, so only ours
        const ids = entries.map((e) => e.id)
        const ours = entries.find((e) => e.id === published.id)
        expect(ours).toMatchObject({ slug: published.slug, handle: seller.handle, images: [] })
        expect(ours?.updatedAt).toBeInstanceOf(Date)
        expect(ids).not.toContain(draft.id)
        expect(ids).not.toContain(deleted.id)
    })
})

describe('getVisibleProductCovers', () => {
    it('returns covers for own, published and bought products, and nothing for others or deleted ones', async () => {
        // setup
        const viewer = await seed.user({ name: 'Viewer' })
        const seller = await seed.user({ name: 'Seller' })
        const ownDraft = await seed.product(viewer, { status: 'draft' })
        const published = await seed.product(seller)
        const foreignDraft = await seed.product(seller, { status: 'draft' })
        const boughtThenUnpublished = await seed.product(seller, { status: 'draft' })
        const pendingOnly = await seed.product(seller, { status: 'draft' })
        const deleted = await seed.product(viewer)
        const noImages = await seed.product(seller)

        const cover = (id: number) => `https://example.ufs.sh/f/cover-${seed.tag}-${id}`
        for (const p of [ownDraft, published, foreignDraft, boughtThenUnpublished, pendingOnly, deleted]) {
            await db
                .update(productsTable)
                .set({ images: [cover(p.id), `${cover(p.id)}-second`] })
                .where(eq(productsTable.id, p.id))
        }
        await db.update(productsTable).set({ deletedAt: new Date() }).where(eq(productsTable.id, deleted.id))
        const purchase = (productId: number, status: 'paid' | 'pending') => ({
            orderId: `order-${seed.tag}-${productId}`,
            buyerId: viewer.id,
            sellerId: seller.id,
            productId,
            productName: 'Snapshot',
            priceInCents: 1250,
            currency: 'RON',
            status,
        })
        await db.insert(purchasesTable).values([
            purchase(boughtThenUnpublished.id, 'paid'),
            purchase(pendingOnly.id, 'pending'),
        ])

        // run
        const covers = await getVisibleProductCovers(viewer.id, [
            ownDraft.id,
            published.id,
            foreignDraft.id,
            boughtThenUnpublished.id,
            pendingOnly.id,
            deleted.id,
            noImages.id,
        ])

        // assertions
        expect(Object.fromEntries(covers)).toEqual({
            [ownDraft.id]: cover(ownDraft.id),
            [published.id]: cover(published.id),
            [boughtThenUnpublished.id]: cover(boughtThenUnpublished.id),
            [noImages.id]: null,
        })
    })

    it('returns an empty map for no ids', async () => {
        // setup
        const viewer = await seed.user({ name: 'Viewer' })

        // run
        const covers = await getVisibleProductCovers(viewer.id, [])

        // assertions
        expect(covers.size).toBe(0)
    })
})
