import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /Life/; the deploy workflow sets BASE_PATH. Local dev and Vercel use /.
  base: process.env.BASE_PATH || '/',
})
