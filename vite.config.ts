import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { legacyColorsPlugin } from './scripts/legacy-colors.mjs'

export default defineConfig({
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
