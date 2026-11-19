import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Customer app. Runs on port 5174 next to the salon app (5173). The API address comes from .env
// (VITE_API_BASE_URL); for the phone apps from .env.android / .env.ios.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174 },
  build: {
    sourcemap: false,
    target: ['es2020', 'chrome87', 'safari14'], // older Android WebViews and iOS 14+
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
