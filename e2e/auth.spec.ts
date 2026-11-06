import { test, expect } from './fixtures/index'
import { loginAs } from './helpers/auth'

test.describe('Authentication', () => {
  test('login page shows error for wrong credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10_000 })
    // Still on login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page does not submit with empty fields', async ({ page }) => {
    await page.goto('/login')
    // HTML5 required validation prevents submission
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('register page — switching to Sign In tab hides confirm password', async ({ page }) => {
    await page.goto('/portal/register')
    // On "New Family" tab by default — confirm password field should be visible
    await expect(page.getByLabel('Confirm Password').or(page.getByPlaceholder('Confirm')).or(
      page.locator('input[type="password"]').nth(1)
    )).toBeVisible()
    // Switch to "Sign In" tab
    await page.getByRole('button', { name: 'Sign In' }).click()
    // Now only one password field
    await expect(page.locator('input[type="password"]')).toHaveCount(1)
  })

  test('register page — weak password shows error', async ({ page }) => {
    await page.goto('/portal/register')
    await page.getByLabel('Email').fill(`test-${Date.now()}@example.com`)
    // Fill password fields (new family mode has 2)
    const passwordFields = page.locator('input[type="password"]')
    await passwordFields.nth(0).fill('123')
    await passwordFields.nth(1).fill('123')
    await page.getByRole('button', { name: /Sign Up|Create Account|Continue/i }).click()
    await expect(page.getByText(/6 characters|weak password/i)).toBeVisible({ timeout: 10_000 })
  })

  test('register page — mismatched passwords shows error', async ({ page }) => {
    await page.goto('/portal/register')
    await page.getByLabel('Email').fill(`test-${Date.now()}@example.com`)
    const passwordFields = page.locator('input[type="password"]')
    await passwordFields.nth(0).fill('ValidPass1!')
    await passwordFields.nth(1).fill('DifferentPass1!')
    await page.getByRole('button', { name: /Sign Up|Create Account|Continue/i }).click()
    await expect(page.getByText(/do not match|passwords/i)).toBeVisible({ timeout: 10_000 })
  })

  test('admin login redirects to /admin', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByText('Admin')).toBeVisible()
  })

  test('admin can sign out', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
  })

  test('teacher login redirects to /portal/teacher', async ({ page }) => {
    await loginAs(page, 'teacher')
    await expect(page).toHaveURL(/\/portal\/teacher/)
    await expect(page.getByText('Teacher Portal')).toBeVisible()
  })

  test('teacher can sign out', async ({ page }) => {
    await loginAs(page, 'teacher')
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
  })

  test('parent login redirects to /portal/parent', async ({ page }) => {
    await loginAs(page, 'parent')
    await expect(page).toHaveURL(/\/portal\/parent/)
  })

  test('parent can sign out', async ({ page }) => {
    await loginAs(page, 'parent')
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
  })
})
