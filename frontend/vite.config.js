import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set VITE_BASE_PATH when serving from a subpath (for example /auction-dapp/)
  // rather than a domain root. Unset for local dev and for a custom domain.
  base: process.env.VITE_BASE_PATH || '/',
})
