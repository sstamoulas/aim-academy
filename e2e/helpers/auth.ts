import { type Page, type BrowserContext } from '@playwright/test'
import { TEST } from '../setup/seed'

type Role = 'admin' | 'teacher' | 'parent'

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin:   { email: TEST.ADMIN_EMAIL,   password: TEST.PASSWORD },
  teacher: { email: TEST.TEACHER_EMAIL, password: TEST.PASSWORD },
  parent:  { email: TEST.PARENT_EMAIL,  password: TEST.PASSWORD },
}

const REDIRECT: Record<Role, string> = {
  admin:   '**/admin',
  teacher: '**/portal/teacher',
  parent:  '**/portal/parent',
}

export async function loginAs(page: Page, role: Role): Promise<void> {
  const { email, password } = CREDENTIALS[role]
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(REDIRECT[role], { timeout: 20_000 })
}

export async function createAuthSession(
  browser: import('@playwright/test').Browser,
  role: Role,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await loginAs(page, role)
  return { context, page }
}
