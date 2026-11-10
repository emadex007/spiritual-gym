import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { legacyColorsPlugin } from './scripts/legacy-colors.mjs'

// A new ID for every build: the app compares it with the server's to offer "New version ready"
const BUILD_ID = Date.now().toString(36)

export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    // See-through brand colours for older iPhones/iPads (Safari before 16.2)
    legacyColorsPlugin(),
  ],
})
