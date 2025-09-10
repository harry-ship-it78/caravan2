import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT: base must match your repo name for GitHub Pages
export default defineConfig({
  base: '/caravan2/',
  plugins: [react()],
  server: {
    host: true // allows testing from phone on LAN (http://<your-ip>:5173)
  }
});