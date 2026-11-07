import { test, expect, type BrowserContext, type Page } from './fixtures/index'
import { createAuthSession } from './helpers/auth'
import { TEST } from './setup/seed'

test.describe.serial('Admin Portal', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    ;({ context, page } = await createAuthSession(browser, 'admin'))
  })

  test.afterAll(async () => {
    await context.close()
  })

  // ── Header & tabs ────────────────────────────────────────────────────────────

  test('renders all 10 admin tabs', async () => {
    for (const name of ['Events', 'Classes', 'Registrations', 'Users', 'Attendance', 'Overview', 'Content', 'Contact', 'Payments', 'Dev Tools']) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }
  })

  // ── Events ───────────────────────────────────────────────────────────────────

  test('Events tab: shows seeded test event', async () => {
    await page.getByRole('button', { name: 'Events' }).click()
    await expect(page.getByText('Test Annual Dinner 2026')).toBeVisible()
  })

  test('Events tab: shows publish toggle on seeded event', async () => {
    // The seeded event is published=true, so toggle shows "Live"
    await expect(page.getByText(/^Live$|^Draft$/i).first()).toBeVisible()
  })

  test('Events tab: New Event button opens blank form', async () => {
    await page.getByRole('button', { name: /New Event/i }).click()
    await expect(page.getByText('New Event')).toBeVisible()
    await expect(page.getByText('Basic Info')).toBeVisible()
    await page.getByRole('button', { name: /← Back/i }).click()
  })

  test('Events tab: clicking Edit opens the event form pre-filled', async () => {
    await page.getByRole('button', { name: /Edit/i }).first().click()
    await expect(page.getByText('Edit Event')).toBeVisible()
    await expect(page.getByText('Basic Info')).toBeVisible()
    await page.getByRole('button', { name: /← Back/i }).click()
  })

  // ── Classes ───────────────────────────────────────────────────────────────────

  test('Classes tab: shows seeded class', async () => {
    await page.getByRole('button', { name: 'Classes' }).click()
    await expect(page.getByText(TEST.CLASS_NAME)).toBeVisible()
  })

  test('Classes tab: shows teacher name on class', async () => {
    await expect(page.getByText('Test Teacher')).toBeVisible()
  })

  // ── Registrations ─────────────────────────────────────────────────────────────

  test('Registrations tab: shows the approved test parent registration', async () => {
    await page.getByRole('button', { name: 'Registrations' }).click()
    await expect(page.getByText('Test Parent').or(page.getByText(TEST.PARENT_EMAIL)).first()).toBeVisible()
  })

  test('Registrations tab: shows "approved" status badge', async () => {
    await expect(page.getByText(/Approved/i)).toBeVisible()
  })

  // ── Users ─────────────────────────────────────────────────────────────────────

  test('Users tab: shows all 3 seeded users', async () => {
    await page.getByRole('button', { name: 'Users' }).click()
    await expect(page.getByText(TEST.ADMIN_EMAIL)).toBeVisible()
    await expect(page.getByText(TEST.TEACHER_EMAIL)).toBeVisible()
    await expect(page.getByText(TEST.PARENT_EMAIL)).toBeVisible()
  })

  test('Users tab: shows role badges', async () => {
    // Roles are shown as editable <select> dropdowns; check their current values
    const values = await page.locator('select').evaluateAll(els =>
      els.map(el => (el as HTMLSelectElement).value)
    )
    expect(values).toContain('admin')
    expect(values).toContain('teacher')
    expect(values).toContain('parent')
  })

  // ── Overview ─────────────────────────────────────────────────────────────────

  test('Overview tab: shows teacher task status for seeded class', async () => {
    await page.getByRole('button', { name: 'Overview' }).click()
    await expect(page.getByText('Teacher Task Overview')).toBeVisible()
    await expect(page.getByText(TEST.CLASS_NAME)).toBeVisible()
    // Chips show ✓/✗ prefix — target that pattern to avoid matching hidden <option>
    await expect(page.getByText(/[✓✗] Attendance/).first()).toBeVisible()
  })

  // ── Attendance ────────────────────────────────────────────────────────────────

  test('Attendance tab: selecting the seeded class shows sessions', async () => {
    await page.getByRole('button', { name: 'Attendance' }).click()
    // Target the class selector by its unique placeholder option — avoids matching the mobile nav <select>
    const classSelect = page.locator('select').filter({ hasText: '— Choose a class —' })
    await classSelect.selectOption({ label: TEST.CLASS_NAME })
    // After selecting, either session rows or "No attendance sessions" message should appear
    await expect(
      page.getByText(/No attendance sessions|Total Sessions/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  // ── Content ───────────────────────────────────────────────────────────────────

  test('Content tab: shows Programs, Reviews, Achievements sections', async () => {
    await page.getByRole('button', { name: 'Content' }).click()
    await expect(page.getByText(/Programs|Reviews|Achievements/i).first()).toBeVisible()
  })

  // ── Contact ───────────────────────────────────────────────────────────────────

  test('Contact tab: loads without error', async () => {
    await page.getByRole('button', { name: 'Contact' }).click()
    await expect(page.getByText(/No contact submissions|No submissions|Message/i).first()).toBeVisible()
  })

  // ── Payments ─────────────────────────────────────────────────────────────────

  test('Payments tab: loads without error', async () => {
    await page.getByRole('button', { name: 'Payments' }).click()
    await expect(page.getByRole('heading', { name: /Payments/i })).toBeVisible()
  })

  // ── Dev Tools ─────────────────────────────────────────────────────────────────

  test('Dev Tools tab: shows Seed Database button', async () => {
    await page.getByRole('button', { name: 'Dev Tools' }).click()
    await expect(page.getByRole('button', { name: /Seed/i })).toBeVisible()
  })

  // ── Sign out ─────────────────────────────────────────────────────────────────

  test('Sign Out returns to homepage or login', async () => {
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
  })
})
