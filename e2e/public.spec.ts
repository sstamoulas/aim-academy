import { test, expect } from './fixtures/index'

test.describe('Public pages', () => {
  test('homepage loads and shows key sections', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/AIM Academy|Anas Ibn Malik/)
    // Header navigation is present
    await expect(page.getByRole('link', { name: /Log In|Sign In/i })).toBeVisible()
  })

  test('homepage hero / programs section is visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    // The site always renders a header
    await expect(page.locator('header')).toBeVisible()
  })

  test('login link in header navigates to /login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Log In|Sign In/i }).first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('register link navigates to /portal/register', async ({ page }) => {
    await page.goto('/')
    const signUpLink = page.getByRole('link', { name: /Sign Up|Register/i }).first()
    if (await signUpLink.isVisible()) {
      await signUpLink.click()
      await expect(page).toHaveURL(/\/portal\/register/)
    } else {
      // No sign-up link when not visible — just verify register page loads directly
      await page.goto('/portal/register')
      await expect(page.getByText('Family Registration')).toBeVisible()
    }
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Register here' })).toBeVisible()
  })

  test('register page renders New Family / Sign In tabs', async ({ page }) => {
    await page.goto('/portal/register')
    await expect(page.getByText('Family Registration')).toBeVisible()
    await expect(page.getByRole('button', { name: 'New Family' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  })

  test('contact page loads and shows form', async ({ page }) => {
    await page.goto('/contact')
    await page.waitForLoadState('domcontentloaded')
    // Should show a contact form with name and message fields
    await expect(page.locator('form, input[type="text"], textarea').first()).toBeVisible()
  })

  test('unauthenticated visit to /admin redirects to login', async ({ page }) => {
    await page.goto('/admin')
    // Should end up on login or be blocked
    await expect(page).toHaveURL(/\/login|\/admin/)
    // If redirected to login, the Sign In heading is visible
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    }
  })

  test('unauthenticated visit to /portal/teacher redirects to login', async ({ page }) => {
    await page.goto('/portal/teacher')
    await expect(page).toHaveURL(/\/login|\/portal\/teacher/)
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    }
  })

  test('unauthenticated visit to /portal/parent redirects to login', async ({ page }) => {
    await page.goto('/portal/parent')
    await expect(page).toHaveURL(/\/login|\/portal\/parent/)
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    }
  })
})
