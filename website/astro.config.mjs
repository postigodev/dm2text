import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { SITE_URL } from './src/config.ts';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  build: { format: 'directory' },
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
});
