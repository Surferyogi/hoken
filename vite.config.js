import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base is RELATIVE by default.
//
// Why: a relative base makes the built site work unchanged from a project page
// (https://user.github.io/repo/), a user page (https://user.github.io/), a
// subfolder on any other host, and even a file:// path opened straight off disk.
// An absolute base ("/") silently breaks every one of those except the root of a
// domain, and the failure mode is a blank screen with no message - which is
// exactly what happened on 2026-08-19.
//
// VITE_BASE can still override it if you ever need an absolute path.
const base = process.env.VITE_BASE || './'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: process.env.VITE_OUT_DIR || 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
