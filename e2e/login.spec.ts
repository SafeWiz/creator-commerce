import { test, expect } from '@playwright/test'

test('logging in lands on the dashboard', async ({ page, request }) => {
    // setup: an account to log into, created over the API so this test does not
    // depend on the signup form. `request` has its own cookie jar, so `page`
    // starts signed out.
    const id = `e2e-${Date.now().toString(36)}`
    const email = `${id}@example.com`
    const password = 'correct-horse-battery'

    const signup = await request.post('/api/auth/sign-up/email', {
        headers: { Origin: 'http://localhost:3000' },
        data: { name: 'E2E Seller', email, password, handle: id },
    })
    expect(signup).toBeOK()

    // run
    await page.goto('/login')

    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // assertions
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Confirm your email address')).toBeVisible()
})
