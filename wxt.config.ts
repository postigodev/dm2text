import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'DM2Text',
    description: 'Copy structured context from Instagram Direct.',
    permissions: ['clipboardWrite'],
    icons: {
      16: '/icon-16.png',
      32: '/icon-32.png',
      48: '/icon-48.png',
      96: '/icon-96.png',
      128: '/icon-128.png',
    },
  },
});
