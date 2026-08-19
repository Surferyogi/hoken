import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo-name>/.
// The deploy workflow sets VITE_BASE to "/<repo-name>/" automatically.
// For a user/organisation site (username.github.io) or a custom domain, VITE_BASE stays "/".
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [react()],
  define: {
    __APP_BASE__: JSON.stringify(base),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
