/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { firstPhotoScript } from './scripts/backgrounds/first-photo.mjs'

// Puts the homepage's first-photo script (scripts/backgrounds/first-photo.mjs) in <head>
function firstPhoto(): Plugin {
  return {
    name: 'first-photo',
    transformIndexHtml(html) {
      const manifest = JSON.parse(readFileSync(new URL('./src/backgrounds/backgrounds.json', import.meta.url), 'utf8'))
      const script = firstPhotoScript(manifest)
      return script ? html.replace('<!-- first-photo -->', `<script>${script}</script>`) : html
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), firstPhoto()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
