import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'DM2Text',
    description: 'Copy structured context from Instagram Direct.',
    permissions: ['clipboardWrite'],
  },
});
