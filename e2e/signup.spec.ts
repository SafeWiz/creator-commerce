import { test, expect } from '@playwright/test'

test('signing up lands on the dashboard with an unverified email', async ({ page }) => {
    // setup: unique per run, since the email and the handle are both unique columns
    const id = `e2e-${Date.now().toString(36)}`

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
