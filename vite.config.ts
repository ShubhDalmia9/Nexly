import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Vite dev server is mounted inside the Express app (see server/index.ts),
// so the API and the UI share one origin and one port in development.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
