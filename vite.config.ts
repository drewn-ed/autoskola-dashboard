import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Média (obrázky/videa otázek) servíruje server.mjs z public/media, do buildu je nekopírujeme
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
