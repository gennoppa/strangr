import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, Vite proxies the API and WebSocket to Spring Boot on :8080,
// so the frontend can always use relative URLs (same as behind nginx in Docker).
const backend = process.env.BACKEND_URL || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/ws': { target: backend, ws: true, changeOrigin: true },
    },
  },
});
