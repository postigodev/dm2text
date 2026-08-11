import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const distUrl = new URL('../dist/', import.meta.url);

const pageUrl = (path) => new URL(path, distUrl);

test('build emits the two required static routes', async () => {
  await access(pageUrl('index.html'));
  await access(pageUrl('privacy/index.html'));
});

test('baseline pages render recognizable content', async () => {
  const home = await readFile(pageUrl('index.html'), 'utf8');
  const privacy = await readFile(pageUrl('privacy/index.html'), 'utf8');

  assert.match(home, /DM2Text/);
  assert.match(privacy, /DM2Text Privacy Policy/);
});
