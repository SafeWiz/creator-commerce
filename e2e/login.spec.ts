import { test, expect } from './fixtures'

test('logging in lands on the dashboard', async ({ page, seed }) => {
    // setup: an account to log into, inserted directly so this test does not
    // depend on the signup form
    const seller = await seed.user({ name: 'E2E Seller' })

    // run
    await page.goto('/login')

    await page.getByLabel('Email').fill(seller.email)
    await page.getByLabel('Password').fill(seller.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // assertions
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Confirm your email address')).toBeVisible()
})
