import { type FullConfig } from '@playwright/test'

export default async function globalTeardown(_config: FullConfig) {
  const pid = (globalThis as Record<string, unknown>).__EMULATOR_PID__ as number | undefined
  if (pid) {
    try {
      process.kill(pid, 'SIGTERM')
      console.log(`\n🔥  Firebase emulators stopped (pid ${pid}).`)
    } catch {
      // already stopped
    }
  }
}
