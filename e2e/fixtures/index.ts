/**
 * Extended Playwright test with Istanbul coverage collection.
 *
 * After each test, `window.__coverage__` (populated by vite-plugin-istanbul)
 * is extracted from the browser and merged into .nyc_output/.
 * Run `npm run coverage:report` after tests to generate the HTML report.
 *
 * Import from here instead of '@playwright/test' in test files
 * when you want coverage data collected.
 */

import { test as base, type Page } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

const OUTPUT_DIR = path.join(process.cwd(), '.nyc_output')

async function collectCoverage(page: Page, testTitle: string) {
  try {
    const coverage = await page.evaluate(() =>
      (window as unknown as Record<string, unknown>).__coverage__ ?? null
    )
    if (!coverage) return

    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    // Sanitise the test title for use as a filename
    const safe = testTitle.replace(/[^a-z0-9]/gi, '_').slice(0, 60)
    const file = path.join(OUTPUT_DIR, `cov_${safe}_${Date.now()}.json`)
    await fs.writeFile(file, JSON.stringify(coverage))
  } catch {
    // Page may have navigated away — non-fatal
  }
}

export const test = base.extend<Record<string, never>>({
  // Shadow the built-in `page` fixture so coverage is auto-collected
  page: async ({ page }, use, testInfo) => {
    await use(page)
    await collectCoverage(page, testInfo.title)
  },
})

export { expect } from '@playwright/test'
