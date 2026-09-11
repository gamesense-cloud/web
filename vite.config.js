import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend lives in src/frontend; the API runs as a separate process on
// API_PORT and is proxied here so the browser only ever talks to one origin.
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
