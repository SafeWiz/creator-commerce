import { test, expect } from './fixtures'

test('signing up lands on the dashboard with an unverified email', async ({ page, seed }) => {
    // setup: named from the scope's tag, so the fixture's cleanup removes the
    // account this test creates through the form
    const id = `${seed.tag}-signup`

    // run
    await page.goto('/signup')

    await page.getByLabel('Name').fill('E2E Seller')
    await page.getByLabel('Email').fill(`${id}@example.com`)
    await page.getByLabel('Storefront handle').fill(id)
    await page.getByLabel('Password').fill('correct-horse-battery')
    await page.getByRole('button', { name: 'Create account' }).click()

    // assertions
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Confirm your email address')).toBeVisible()
})
