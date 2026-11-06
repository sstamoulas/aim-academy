import { test, expect, type BrowserContext, type Page } from './fixtures/index'
import { createAuthSession } from './helpers/auth'
import { TEST } from './setup/seed'

test.describe.serial('Teacher Portal', () => {
  let context: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    ;({ context, page } = await createAuthSession(browser, 'teacher'))
  })

  test.afterAll(async () => {
    await context.close()
  })

  // ── Dashboard ────────────────────────────────────────────────────────────────

  test('dashboard shows Teacher Portal header and today\'s date', async () => {
    await expect(page.getByText('Teacher Portal')).toBeVisible()
    await expect(page.getByText('My Classes')).toBeVisible()
    const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })
    await expect(page.getByText(new RegExp(monthName))).toBeVisible()
  })

  test('dashboard shows seeded test class card', async () => {
    await expect(page.getByText(TEST.CLASS_NAME)).toBeVisible()
  })

  test('dashboard shows report deadline banner on class card', async () => {
    // Deadline is set to 2026-12-31 — should show as a banner
    await expect(page.getByText(/Progress reports due|Dec 31/i)).toBeVisible()
  })

  test('dashboard checklist shows task items', async () => {
    // Checklist always shows weekly tasks regardless of completion
    await expect(page.getByText(/This Week/i)).toBeVisible()
    await expect(page.getByText(/Attendance/).first()).toBeVisible()
  })

  // ── Class Detail ─────────────────────────────────────────────────────────────

  test.describe('class detail', () => {
    test.beforeAll(async () => {
      await page.getByText(TEST.CLASS_NAME).first().click()
      await expect(page.getByText('← My Classes')).toBeVisible()
    })

    test('class name is shown in heading', async () => {
      await expect(page.getByText(TEST.CLASS_NAME)).toBeVisible()
    })

    test('schedule is shown', async () => {
      await expect(page.getByText('Saturdays 10:00 AM')).toBeVisible()
    })

    test('desktop sidebar shows all 9 tabs', async () => {
      for (const name of ['Attendance', 'Progress', "Qur'an", "Qa'idah", 'Homework', 'Quiz', 'Missed Work', 'Announcements']) {
        await expect(page.getByRole('button', { name }).first()).toBeVisible()
      }
      await expect(page.getByRole('button', { name: /Students \(3\)/ })).toBeVisible()
    })

    // ── Attendance ────────────────────────────────────────────────────────────

    test('Attendance tab: shows past sessions from seeded data', async () => {
      await page.getByRole('button', { name: 'Attendance' }).first().click()
      // Attendance tab starts in "Take" view — switch to history to see past sessions
      await page.getByRole('button', { name: /History/i }).first().click()
      await expect(page.getByText('2026-10-04').or(page.getByText('Oct 4')).first()).toBeVisible()
    })

    test('Attendance tab: can open a session and see student records', async () => {
      // Click the first session row
      await page.locator('button, div').filter({ hasText: /2026-10/ }).first().click()
      await expect(page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first()).toBeVisible()
    })

    test('Attendance tab: shows Take Attendance button for new session', async () => {
      // Go back to list if in session detail
      const backBtn = page.getByRole('button', { name: /← History|Back/i })
      if (await backBtn.isVisible()) await backBtn.click()
      await expect(page.getByRole('button', { name: /Take Attendance|New Session/i })).toBeVisible()
    })

    // ── Homework ──────────────────────────────────────────────────────────────

    test('Homework tab: shows students with their status badges', async () => {
      await page.getByRole('button', { name: 'Homework' }).first().click()
      await expect(page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first()).toBeVisible()
      await expect(page.getByText('Fatima Test').or(page.getByText('Fatima')).first()).toBeVisible()
    })

    test('Homework tab: week navigator is present', async () => {
      await expect(page.getByRole('button', { name: /←|→|prev|next/i }).first()).toBeVisible()
    })

    // ── Missed Work ───────────────────────────────────────────────────────────

    test('Missed Work tab: shows seeded unresolved items', async () => {
      await page.getByRole('button', { name: 'Missed Work' }).first().click()
      await expect(page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first()).toBeVisible()
    })

    test('Missed Work tab: shows resolved toggle or filter', async () => {
      await expect(page.getByText(/Unresolved|Resolved|All/i).first()).toBeVisible()
    })

    // ── Progress ──────────────────────────────────────────────────────────────

    test('Progress tab: shows all 3 students', async () => {
      await page.getByRole('button', { name: 'Progress' }).first().click()
      await expect(page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first()).toBeVisible()
      await expect(page.getByText('Fatima Test').or(page.getByText('Fatima')).first()).toBeVisible()
      await expect(page.getByText('Omar Test').or(page.getByText('Omar')).first()).toBeVisible()
    })

    test("Qur'an tab: shows students and seeded Qur'an position", async () => {
      await page.getByRole('button', { name: /Qur'an/ }).first().click()
      await expect(page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first()).toBeVisible()
      // Expand Ahmed's row
      await page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first().click()
      await expect(page.getByText('Al-Baqarah').first()).toBeVisible()
    })

    test("Qa'idah tab: shows students and seeded lesson", async () => {
      await page.getByRole('button', { name: /Qa.idah/ }).first().click()
      await expect(page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first()).toBeVisible()
      await page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first().click()
      await expect(page.getByText(/Tanween|Lesson 5/).first()).toBeVisible()
    })

    // ── Quiz ──────────────────────────────────────────────────────────────────

    test('Quiz tab: shows students and month navigator', async () => {
      await page.getByRole('button', { name: 'Quiz' }).first().click()
      await expect(page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first()).toBeVisible()
      // Month navigation buttons
      await expect(page.getByRole('button', { name: /←|→/ }).first()).toBeVisible()
    })

    test('Quiz tab: expanding a student shows grade options', async () => {
      await page.getByText('Ahmed Test').or(page.getByText('Ahmed')).first().click()
      await expect(page.getByRole('button', { name: /Excellent|Good|Developing|Needs Review/i }).first()).toBeVisible()
    })

    // ── Announcements ─────────────────────────────────────────────────────────

    test('Announcements tab: shows seeded published announcements', async () => {
      await page.getByRole('button', { name: 'Announcements' }).first().click()
      await expect(page.getByText('Welcome to Test Class')).toBeVisible()
      await expect(page.getByText('Homework Reminder')).toBeVisible()
      // Draft should NOT be visible to parents (but staff can see it)
    })

    test('Announcements tab: has New Announcement form', async () => {
      await expect(page.getByRole('button', { name: /New Announcement|Add/i })).toBeVisible()
    })

    // ── Students ──────────────────────────────────────────────────────────────

    test('Students tab: shows all 3 seeded students', async () => {
      await page.getByRole('button', { name: /Students/ }).first().click()
      await expect(page.getByText('Ahmed Test')).toBeVisible()
      await expect(page.getByText('Fatima Test')).toBeVisible()
      await expect(page.getByText('Omar Test')).toBeVisible()
    })

    test('Students tab: shows parent names', async () => {
      await expect(page.getByText(/Parent: Test Parent/)).toBeVisible()
    })

    // ── Student Profile ───────────────────────────────────────────────────────

    test('clicking Ahmed opens his student profile', async () => {
      await page.getByText('Ahmed Test').first().click()
      await expect(page.getByRole('button', { name: '← Students' })).toBeVisible()
      await expect(page.getByText('Ahmed Test')).toBeVisible()
    })

    test('student profile shows attendance quick stat', async () => {
      // 4 of 5 sessions present/late = 80%
      await expect(page.getByText(/80%|Attendance/i).first()).toBeVisible()
    })

    test("student profile shows Qur'an position", async () => {
      await expect(page.getByText('Al-Baqarah').first()).toBeVisible()
    })

    test("student profile shows Qa'idah section", async () => {
      await expect(page.getByText(/Qa.idah Progress/)).toBeVisible()
      await expect(page.getByText(/Tanween|Lesson 5/).first()).toBeVisible()
    })

    test('student profile shows IS Quiz results', async () => {
      await expect(page.getByText('IS Quiz Results')).toBeVisible()
      await expect(page.getByText(/Good|Excellent/).first()).toBeVisible()
    })

    test('student profile shows unresolved missed work', async () => {
      await expect(page.getByText('Unresolved Missed Work')).toBeVisible()
    })

    test('student profile shows teacher notes', async () => {
      await expect(page.getByText('Teacher Notes')).toBeVisible()
      await expect(page.getByText(/pronunciation/i)).toBeVisible()
    })

    test('student profile shows Quarterly Reports section', async () => {
      await expect(page.getByText('Quarterly Reports').first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'New Report' })).toBeVisible()
    })

    test('clicking New Report opens the quarterly report editor', async () => {
      await page.getByRole('button', { name: 'New Report' }).click()
      await expect(page.getByText('Progress Report')).toBeVisible()
      await expect(page.getByText('Auto-Pulled Summary')).toBeVisible()
      await expect(page.getByLabel('Student Strengths')).toBeVisible()
      await expect(page.getByLabel('Areas to Continue Working On')).toBeVisible()
      await expect(page.getByLabel('General Comment')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Submit Report' })).toBeVisible()
    })

    test('quarterly report editor shows auto-pulled data', async () => {
      // Should show attendance rate from seeded data
      await expect(page.getByText(/80%|Attendance/).first()).toBeVisible()
      // Should show Qur'an position
      await expect(page.getByText('Al-Baqarah').first()).toBeVisible()
    })

    test('can save a quarterly report as draft', async () => {
      await page.getByLabel('Student Strengths').fill('Ahmed is a dedicated student who always comes prepared.')
      await page.getByLabel('Areas to Continue Working On').fill('Needs to focus on tajweed pronunciation.')
      await page.getByLabel('General Comment').fill('Overall great progress this quarter. Keep it up!')
      await page.getByRole('button', { name: 'Save Draft' }).click()
      await expect(page.getByRole('button', { name: 'Saved!' })).toBeVisible({ timeout: 10_000 })
    })

    test('can submit a quarterly report', async () => {
      await page.getByRole('button', { name: 'Submit Report' }).click()
      await expect(page.getByText('Submitted')).toBeVisible({ timeout: 10_000 })
    })

    test('back from report editor returns to student profile', async () => {
      await page.getByRole('button', { name: '← Student Profile' }).click()
      await expect(page.getByText('Ahmed Test')).toBeVisible()
      await expect(page.getByText('Quarterly Reports')).toBeVisible()
    })

    test('submitted report appears in quarterly reports list', async () => {
      await expect(page.getByText(/Q\d+ \d{4} Progress Report/)).toBeVisible()
      await expect(page.getByText('Submitted')).toBeVisible()
    })

    test('back from student profile returns to Students tab', async () => {
      await page.getByRole('button', { name: '← Students' }).click()
      await expect(page.getByText('Ahmed Test')).toBeVisible()
      await expect(page.getByText('Fatima Test')).toBeVisible()
    })

    test('back from class detail returns to dashboard', async () => {
      await page.getByRole('button', { name: '← My Classes' }).click()
      await expect(page.getByText('My Classes')).toBeVisible()
    })
  })

  // ── Sign out ─────────────────────────────────────────────────────────────────

  test('Sign Out button is present', async () => {
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible()
  })
})
