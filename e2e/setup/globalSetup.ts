import { type FullConfig } from '@playwright/test'
import { spawn, type ChildProcess } from 'child_process'
import { seed } from './seed'

let emulatorProcess: ChildProcess | null = null

// ── Wait for a port to be accepting connections ───────────────────────────────

async function waitForPort(host: string, port: number, timeoutMs = 30_000): Promise<void> {
  const { createConnection } = await import('net')
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise<void>((resolve, reject) => {
      const sock = createConnection(port, host)
      sock.once('connect', () => { sock.destroy(); resolve() })
      sock.once('error',   () => { sock.destroy(); reject(new Error('not ready')) })
    }).then(() => { return }, () => { return })

    const sock = createConnection(port, host)
    const ready = await new Promise<boolean>(res => {
      sock.once('connect', () => { sock.destroy(); res(true)  })
      sock.once('error',   () => { sock.destroy(); res(false) })
    })
    if (ready) return
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Emulator not ready on ${host}:${port} after ${timeoutMs}ms`)
}

async function emulatorsRunning(): Promise<boolean> {
  const { createConnection } = await import('net')
  return new Promise(resolve => {
    const sock = createConnection(9099, 'localhost')
    sock.once('connect', () => { sock.destroy(); resolve(true)  })
    sock.once('error',   () => { sock.destroy(); resolve(false) })
  })
}

// ── Playwright global setup ───────────────────────────────────────────────────

export default async function globalSetup(_config: FullConfig) {
  const alreadyRunning = await emulatorsRunning()

  if (!alreadyRunning) {
    console.log('\n🔥  Starting Firebase emulators…')
    emulatorProcess = spawn(
      'firebase',
      ['emulators:start', '--only', 'auth,firestore,storage'],
      { stdio: ['ignore', 'pipe', 'pipe'], cwd: process.cwd() },
    )

    // Surface emulator output on failure
    let emulatorLogs = ''
    emulatorProcess.stdout?.on('data', (d: Buffer) => { emulatorLogs += d.toString() })
    emulatorProcess.stderr?.on('data', (d: Buffer) => { emulatorLogs += d.toString() })

    // Store PID so globalTeardown can kill it
    ;(globalThis as Record<string, unknown>).__EMULATOR_PID__ = emulatorProcess.pid

    try {
      await Promise.all([
        waitForPort('localhost', 9099, 45_000), // Auth
        waitForPort('localhost', 8081, 45_000), // Firestore
        waitForPort('localhost', 9199, 45_000), // Storage
      ])
      console.log('🔥  Emulators ready.')
    } catch (err) {
      console.error('Emulator logs:\n', emulatorLogs)
      throw err
    }
  } else {
    console.log('🔥  Emulators already running — reusing.')
  }

  // Seed test data fresh on every run
  await seed()
}
