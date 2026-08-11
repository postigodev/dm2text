import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const distUrl = new URL('../dist/', import.meta.url);

const pageUrl = (path) => new URL(path, distUrl);
const visibleText = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(
        `${entry.name}${entry.isDirectory() ? '/' : ''}`,
        directory,
      );
      return entry.isDirectory() ? walk(url) : [url];
    }),
  );
  return nested.flat();
};

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

test('every Add to Chrome CTA uses the local Chrome logo', async () => {
  const home = await readFile(pageUrl('index.html'), 'utf8');
  const chromeCtas = home.match(/>Add to Chrome<\/a>/g) ?? [];
  const chromeLogos =
    home.match(
      /<img src="\/brand\/google-chrome\.svg" alt="" width="18" height="18" aria-hidden="true">/g,
    ) ?? [];

  assert.equal(chromeCtas.length, 2);
  assert.equal(chromeLogos.length, chromeCtas.length);
  assert.doesNotMatch(home, /lucide-download/);
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

test('privacy page renders the complete approved policy contract', async () => {
  const privacy = await readFile(pageUrl('privacy/index.html'), 'utf8');
  const text = visibleText(privacy);

  const requiredText = [
    'Last updated: August 10, 2026',
    'Data handled',
    'How the data is used',
    'Local processing',
    'Storage and retention',
    'Data sharing',
    'Analytics and tracking',
    'Authentication',
    'Permissions',
    'Limited Use',
    'Changes',
    'Contact',
    'message text',
    'clipboardWrite',
    'Chrome Web Store User Data Policy',
  ];

  for (const value of requiredText) assert.match(text, new RegExp(value));

  assert.match(
    privacy,
    /href="https:\/\/github\.com\/postigodev\/dm2text\/issues"/,
  );
  assert.match(privacy, /href="https:\/\/github\.com\/postigodev\/dm2text"/);
});

test('artifact has no hydrated client bundle or unintended HTML route', async () => {
  const files = await walk(distUrl);
  const relativePaths = files.map((url) =>
    decodeURIComponent(url.pathname.split('/dist/')[1]),
  );
  const scripts = relativePaths.filter((path) => /\.(?:m?js)$/.test(path));
  const pages = relativePaths.filter((path) => path.endsWith('.html')).sort();

  assert.deepEqual(scripts, []);
  assert.deepEqual(pages, ['index.html', 'privacy/index.html']);

  for (const path of pages) {
    const html = await readFile(pageUrl(path), 'utf8');
    assert.doesNotMatch(
      html,
      /astro-island|client:(?:load|idle|visible|media|only)/,
    );
  }
});
