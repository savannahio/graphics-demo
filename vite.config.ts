import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/graphics-demo/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2000 },
});
