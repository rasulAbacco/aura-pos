import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the API is proxied, so the SPA and API share an origin and the
// SameSite=Strict refresh cookie works exactly as it will behind a production reverse proxy.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
  build: { sourcemap: false },
});
