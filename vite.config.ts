import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Média (obrázky/videa otázek) servíruje server.mjs z public/media, do buildu je nekopírujeme
export default defineConfig({
  plugins: [react()],
  publicDir: false,
});
