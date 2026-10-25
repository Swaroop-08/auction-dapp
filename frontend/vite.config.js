import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /auction-dapp/, so asset paths must
  // be rebased. Leave unset for local dev and for a custom domain.
  base: process.env.VITE_BASE_PATH || '/',
})
