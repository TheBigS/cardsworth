import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` defaults to "/" for local dev and self-hosting. The GitHub Pages
// deploy workflow sets VITE_BASE=/cardsworth/ so assets resolve under the
// project subpath (https://thebigs.github.io/cardsworth/).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
