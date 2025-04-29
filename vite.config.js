import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.jsx': 'jsx', '.js': 'jsx', '.ts': 'tsx' }
    }
  },
  plugins: [react()]
});