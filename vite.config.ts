import { defineConfig } from 'vite'

// GitHub Pages: https://longxia7hao-dev.github.io/hero-type-fighter/
export default defineConfig({
  base: process.env.VITE_BASE || '/hero-type-fighter/',
  server: {
    host: true,
    port: 5174,
  },
  preview: {
    host: true,
    port: 4174,
  },
})
