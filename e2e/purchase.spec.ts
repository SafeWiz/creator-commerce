import { FAKE_STRIPE_URL } from './fake-stripe/url'
import { BASE_URL, test, expect } from './fixtures'

test('buying a product through a mocked Stripe checkout lands it in purchases', async ({
    page,
    request,
    seed,
}) => {
    // setup: a seller with one published product, and a signed-in buyer.
    //
    // The buyer signs in through `page.request`, which shares the page's cookie
    // jar, so `page` starts signed in. The login form itself is login.spec.ts's
    // concern.
    const seller = await seed.user({ name: 'E2E Seller' })
    const buyer = await seed.user({ name: 'E2E Buyer' })
    const product = await seed.product(seller, { name: `E2E Product ${seed.tag}`, priceInCents: 1250 })

    const signIn = await page.request.post('/api/auth/sign-in/email', {
        headers: { Origin: BASE_URL },
        data: { email: buyer.email, password: buyer.password },
    })
    expect(signIn).toBeOK()

    // run: product page → cart → checkout
    await page.goto(product.url)
    await page.getByRole('button', { name: /^Add to cart/ }).click()
    await expect(page.getByRole('button', { name: 'In cart' })).toBeVisible()

    await page.goto('/cart')
    await page.getByRole('button', { name: /^Checkout/ }).click()

    // The redirect target is the proof the mock is wired in. Landing anywhere
    // else means the app called the real Stripe.
    await page.waitForURL((url) => url.origin !== BASE_URL)
    expect(
        page.url(),
        `checkout went to ${new URL(page.url()).origin}, not the fake Stripe — is STRIPE_API_BASE reaching the app server? (see playwright.config.ts)`,
    ).toMatch(new RegExp(`^${FAKE_STRIPE_URL}/pay/`))

    // What the app asked Stripe to charge — the part only the mock can see.
    const sessionId = new URL(page.url()).pathname.split('/').pop()!
    const recorded = await (await request.get(`${FAKE_STRIPE_URL}/__fake/sessions/${sessionId}`)).json()
    expect(recorded.params).toMatchObject({
        mode: 'payment',
        line_items: [
            {
                quantity: '1',
                price_data: { unit_amount: '1250', product_data: { name: product.name } },
            },
        ],
    })

    // run: "pay" on the fake hosted page
    await expect(page.getByText('Total: 12.50 RON')).toBeVisible()
    await page.getByRole('button', { name: 'Pay' }).click()

    // assertions: back through /checkout/return, which retrieved the session
    // from the fake, saw it paid and fulfilled the order.
    await expect(page).toHaveURL('/purchases')
    await expect(page.getByRole('link', { name: product.name })).toBeVisible()

    // ...and emptied the cart, which only happens once payment is confirmed.
    await page.goto('/cart')
    await expect(page.getByText('Your cart is empty.')).toBeVisible()
})
