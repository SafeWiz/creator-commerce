import { BASE_URL, test, expect } from './fixtures'

// Every test here runs signed out: `page` starts with an empty cookie jar.
// Results are narrowed with `?q=<tag>`, so each test sees only its own rows
// and never depends on what parallel tests have published (see CLAUDE.md,
// "# Testing").

test('a signed-out visitor can search explore and sees published products only', async ({ page, seed }) => {
    // setup
    const seller = await seed.user({ name: 'Explore Seller' })
    const published = await seed.product(seller, { name: `Explore Published ${seed.tag}` })
    const draft = await seed.product(seller, { name: `Explore Draft ${seed.tag}`, status: 'draft' })

    // run
    const response = await page.goto(`/explore?q=${seed.tag}`)

    // assertions: served, not redirected to /login
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(`/explore?q=${seed.tag}`)
    await expect(page.getByRole('heading', { name: 'Explore' })).toBeVisible()
    await expect(page.getByRole('link', { name: published.name })).toBeVisible()
    await expect(page.getByRole('link', { name: draft.name })).toHaveCount(0)
    // the public header, not the dashboard's, and sign-in returns here. Located
    // as an anchor, not by role: Base UI's Button gives a non-native element
    // role="button", so this link's accessible role is button.
    await expect(page.locator('header a', { hasText: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Fexplore')
})

test('a signed-out visitor can add a product to the cart from explore', async ({ page, seed }) => {
    // setup
    const seller = await seed.user({ name: 'Explore Cart' })
    const product = await seed.product(seller, { name: `Explore Cart ${seed.tag}` })

    // run
    await page.goto(`/explore?q=${seed.tag}`)
    await page.getByRole('button', { name: `Add ${product.name} to cart` }).click()

    // assertions
    await expect(page.getByRole('button', { name: `Remove ${product.name} from cart` })).toBeVisible()
    await page.goto('/cart')
    await expect(page.getByRole('link', { name: product.name })).toBeVisible()
})

test('bare explore is indexable with a canonical url; a search is noindex', async ({ page }) => {
    // run
    await page.goto('/explore?sort=oldest')

    // assertions: no robots meta at all means index, follow
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE_URL}/explore`)

    // run
    await page.goto('/explore?q=anything')

    // assertions
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE_URL}/explore`)
})

test('the sitemap lists explore', async ({ request }) => {
    // run
    const response = await request.get('/sitemap.xml')

    // assertions
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain(`<loc>${BASE_URL}/explore</loc>`)
})
