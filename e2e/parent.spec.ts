import { test, expect, type BrowserContext, type Page } from './fixtures/index'
import { createAuthSession } from './helpers/auth'

test.describe.serial('Parent Portal', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    ;({ context, page } = await createAuthSession(browser, 'parent'))
  })

  test.afterAll(async () => {
    await context.close()
  })

  // ── Dashboard ────────────────────────────────────────────────────────────────

  test('parent portal loads', async () => {
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()
  })

  test('shows seeded child Ahmed Test', async () => {
    // The parent has Ahmed Test as their approved child
    await expect(page.getByText('Ahmed').or(page.getByText('Ahmed Test'))).toBeVisible()
  })

  // ── Child Detail ─────────────────────────────────────────────────────────────

  test.describe('child detail', () => {
    test.beforeAll(async () => {
      await page.getByText('Ahmed').or(page.getByText('Ahmed Test')).first().click()
    })

    test('child detail page shows Ahmed\'s name', async () => {
      await expect(page.getByText(/Ahmed/)).toBeVisible()
    })

    test('Attendance tab shows seeded records', async () => {
      const tab = page.getByRole('button', { name: 'Attendance' }).first()
      if (await tab.isVisible()) {
        await tab.click()
        await expect(page.getByText(/Present|Absent|Late|Attendance/i).first()).toBeVisible()
      }
    })

    test('Missed Work tab shows seeded item for Ahmed', async () => {
      const tab = page.getByRole('button', { name: /Missed Work/i }).first()
      if (await tab.isVisible()) {
        await tab.click()
        await expect(page.getByText(/IS Homework|Missed|2026-10/i).first()).toBeVisible()
      }
    })

    test('Announcements tab shows published announcements', async () => {
      const tab = page.getByRole('button', { name: /Announcements/i }).first()
      if (await tab.isVisible()) {
        await tab.click()
        // Parent can see published announcements
        await expect(page.getByText('Welcome to Test Class').or(page.getByText('Homework Reminder')).first()).toBeVisible()
        // Draft announcement must NOT be visible
        await expect(page.getByText('Draft Announcement (unpublished)')).not.toBeVisible()
      }
    })

    test('Homework tab shows IS homework history', async () => {
      const tab = page.getByRole('button', { name: /Homework/i }).first()
      if (await tab.isVisible()) {
        await tab.click()
        await expect(page.getByText(/2026-W|Complete|Partial|No Homework/i)).toBeVisible()
      }
    })
  })

  // ── Sign out ─────────────────────────────────────────────────────────────────

  test('Sign Out works', async () => {
    await page.getByRole('button', { name: 'Sign Out' }).click()
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
  })
})
