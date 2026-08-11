import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const distUrl = new URL('../dist/', import.meta.url);

const pageUrl = (path) => new URL(path, distUrl);
const visibleText = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

test('landing page explains the real copy workflow and output', async () => {
  const home = await readFile(pageUrl('index.html'), 'utf8');
  const text = visibleText(home);

  assert.match(text, /Local-first · Open source/);
  assert.match(text, /Copy Instagram chats into clean, structured text\./);
  assert.match(text, /Ends at the selected message/);
  assert.match(text, /Messages to include/);
  assert.match(home, />50</);
  assert.match(text, /Choose the endpoint/);
  assert.match(
    text,
    /Choose how many messages to include, ending at the selected message\./,
  );
  assert.match(text, /Paste anywhere/);
  assert.match(text, /Person B: \[shared post by example\.account\]/);
  assert.match(text, /Caption: A visible post caption/);
});

test('landing page states privacy and independence precisely', async () => {
  const home = await readFile(pageUrl('index.html'), 'utf8');
  const text = visibleText(home);

  assert.match(text, /Your DMs stay in your browser\./);
  assert.match(text, /Local processing/);
  assert.match(text, /No persistent storage/);
  assert.match(text, /No analytics/);
  assert.match(text, /No conversation uploads/);
  assert.match(text, /Built in the open\./);
  assert.match(text, /GPL-3\.0/);
  assert.match(
    text,
    /not affiliated with, endorsed by, or sponsored by Instagram or Meta/,
  );
  assert.match(home, /https:\/\/github\.com\/postigodev\/dm2text\/issues/);
});
