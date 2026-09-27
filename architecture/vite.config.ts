import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths, so the built page works under any Pages path (…/whyline/architecture/).
export default defineConfig({ base: './', plugins: [react()] });
