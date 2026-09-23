import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // The shared package is consumed as TypeScript source, not a build
      // artifact: one less build step, and the web app's type errors point at
      // the real lines in core rather than a .d.ts.
      "@tiny-budget/core": path.resolve(import.meta.dirname, "./packages/core/src/index.ts"),
    },
  },
})
