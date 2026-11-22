import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import istanbul from 'vite-plugin-istanbul'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Only instrument source when running E2E coverage
    ...(process.env.VITE_COVERAGE === 'true' ? [
      istanbul({
        include: 'src/**/*',
        exclude: ['node_modules', 'e2e/**'],
        extension: ['.ts', '.tsx'],
        requireEnv: false,
        forceBuildInstrument: false,
      }),
    ] : []),
  ],
})
