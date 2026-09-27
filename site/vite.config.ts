import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The interactive diagrams come straight from architecture/: one source for the README GIFs and this site.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@flow': here('../architecture/src'), '@figures': here('../architecture/figures') },
    dedupe: ['react', 'react-dom'],
  },
  server: { fs: { allow: [here('..')] } },
});
