import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Cloudflare Pages serves from dist/
    outDir: 'dist',

    // Raise chunk warning limit (Cloudflare Pages limit is 25MB, we're well under)
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Split vendor chunks for better caching on Cloudflare's CDN
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'markdown': ['marked'],
          'utils': ['uuid'],
        },
      },
    },

    // Minify with esbuild (fastest, good enough)
    minify: 'esbuild',

    // Generate sourcemaps for error tracking (optional — remove if you want smaller deploy)
    sourcemap: false,

    // Target modern browsers only (Cloudflare's edge handles old browsers poorly anyway)
    target: 'es2020',
  },

  // Ensure assets are correctly referenced when deployed to root
  base: '/',

  // Optimize deps for faster cold starts
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'marked', 'uuid'],
  },
})

