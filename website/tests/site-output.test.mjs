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

test('pages expose canonical metadata and shared navigation', async () => {
  const home = await readFile(pageUrl('index.html'), 'utf8');
  const privacy = await readFile(pageUrl('privacy/index.html'), 'utf8');

  assert.match(
    home,
    /<link rel="canonical" href="https:\/\/dm2text\.postigo\.sh\/"/,
  );
  assert.match(
    privacy,
    /<link rel="canonical" href="https:\/\/dm2text\.postigo\.sh\/privacy\/"/,
  );
  assert.match(home, /href="\/privacy\/"/);
  assert.match(home, /https:\/\/github\.com\/postigodev\/dm2text/);
  assert.match(home, /Manual install via GitHub/);
});

test('build includes exact local brand assets', async () => {
  await access(pageUrl('brand/dm2text-mark.svg'));
  await access(pageUrl('brand/icon-32.png'));
  await access(pageUrl('brand/icon-96.png'));
  await access(pageUrl('brand/icon-128.png'));
});
