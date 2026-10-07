import { neon } from '@neondatabase/serverless'
import { test, expect, type APIRequestContext } from '@playwright/test'

import { FAKE_STRIPE_URL } from './fake-stripe/url'

const sql = neon(process.env.PG_CONNECTION_STRING!)

async function signUp(request: APIRequestContext, name: string) {
    const id = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const response = await request.post('/api/auth/sign-up/email', {
        headers: { Origin: 'http://localhost:3000' },
        data: { name, email: `${id}@example.com`, password: 'correct-horse-battery', handle: id },
    })
    expect(response).toBeOK()
    const { user } = await response.json()
    return { id: user.id as string, handle: id }
}

test('buying a product through a mocked Stripe checkout lands it in purchases', async ({
    page,
    request,
}) => {
    // setup: a seller with one published product, and a signed-in buyer.
    //
    // The seller signs up through `request`, which has its own cookie jar; the
    // buyer through `page.request`, which shares the page's, so `page` starts
    // signed in as the buyer.
    //
    // The product is inserted straight into the database. Creating one through
    // the app needs a file uploaded to UploadThing — a second external service
    // this test is not about — and `file_key` is nullable for exactly that kind
    // of row. Checkout only reads the name and the price.
    const seller = await signUp(request, 'E2E Seller')
    await signUp(page.request, 'E2E Buyer')

    const productName = `E2E Product ${seller.handle}`
    const [product] = await sql`
        insert into products (owner_id, name, slug, price_in_cents, status)
        values (${seller.id}, ${productName}, 'e2e-product', 1250, 'published')
        returning id`

    // run: product page → cart → checkout
    await page.goto(`/@${seller.handle}/${product.id}/e2e-product`)
    await page.getByRole('button', { name: /^Add to cart/ }).click()
    await expect(page.getByRole('button', { name: 'In cart' })).toBeVisible()

    await page.goto('/cart')
    await page.getByRole('button', { name: /^Checkout/ }).click()

    // The redirect target is the proof the mock is wired in. Landing anywhere
    // else means the app called the real Stripe — almost always a `next dev`
    // started by hand, which playwright.config.ts reuses without its env.
    await page.waitForURL((url) => url.origin !== 'http://localhost:3000')
    expect(
        page.url(),
        `checkout went to ${new URL(page.url()).origin}, not the fake Stripe — stop your own \`npm run dev\` and let Playwright start it (see playwright.config.ts)`,
    ).toMatch(new RegExp(`^${FAKE_STRIPE_URL}/pay/`))

    // What the app asked Stripe to charge — the part only the mock can see.
    const sessionId = new URL(page.url()).pathname.split('/').pop()!
    const recorded = await (await request.get(`${FAKE_STRIPE_URL}/__fake/sessions/${sessionId}`)).json()
    expect(recorded.params).toMatchObject({
        mode: 'payment',
        line_items: [
            {
                quantity: '1',
                price_data: { unit_amount: '1250', product_data: { name: productName } },
            },
        ],
    })

    // run: "pay" on the fake hosted page
    await expect(page.getByText('Total: 12.50 RON')).toBeVisible()
    await page.getByRole('button', { name: 'Pay' }).click()

    // assertions: back through /checkout/return, which retrieved the session
    // from the fake, saw it paid and fulfilled the order.
    await expect(page).toHaveURL('/purchases')
    await expect(page.getByRole('link', { name: productName })).toBeVisible()

    // ...and emptied the cart, which only happens once payment is confirmed.
    await page.goto('/cart')
    await expect(page.getByText('Your cart is empty.')).toBeVisible()
})
