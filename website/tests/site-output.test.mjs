import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const distUrl = new URL('../dist/', import.meta.url);
const repositoryRootUrl = new URL('../../', import.meta.url);
const pageUrl = (path) => new URL(path, distUrl);
const text = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const walk = async (directory) =>
  (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const url = new URL(
          `${entry.name}${entry.isDirectory() ? '/' : ''}`,
          directory,
        );
        return entry.isDirectory() ? walk(url) : [url];
      }),
    )
  ).flat();

test('build emits only the required static routes', async () => {
  await access(pageUrl('index.html'));
  await access(pageUrl('privacy/index.html'));
  const files = await walk(distUrl);
  const paths = files.map((url) =>
    decodeURIComponent(url.pathname.split('/dist/')[1]),
  );
  assert.deepEqual(paths.filter((path) => path.endsWith('.html')).sort(), [
    'index.html',
    'privacy/index.html',
  ]);
  assert.deepEqual(
    paths.filter((path) => /\.(?:m?js)$/.test(path)),
    [],
  );
});

test('website build is independent of generated WXT configuration', async () => {
  const config = JSON.parse(
    await readFile(new URL('tsconfig.json', repositoryRootUrl), 'utf8'),
  );
  assert.notEqual(config.extends, './.wxt/tsconfig.json');
  assert.ok(config.include.includes('.wxt/wxt.d.ts'));
});

test('home matches the reference product presentation', async () => {
  const html = await readFile(pageUrl('index.html'), 'utf8');
  const visible = text(html);
  assert.match(html, /href="\/privacy\/"/);
  assert.match(html, /https:\/\/github\.com\/postigodev\/dm2text/);
  assert.match(html, /src="\/marketing\/dm-example\.png"/);
  assert.match(html, /src="\/brand\/google-chrome\.svg"/);
  assert.match(visible, /Copy context/);
  assert.match(visible, /clipboard\.txt plain text/);
  assert.match(
    visible,
    /copies part of an Instagram Direct conversation as plain text/,
  );
  assert.match(visible, /Manual install via GitHub/);
  assert.doesNotMatch(visible, /bedant/i);
});

test('privacy renders the approved policy in the reference layout', async () => {
  const html = await readFile(pageUrl('privacy/index.html'), 'utf8');
  const visible = text(html);
  for (const value of [
    'Privacy',
    'Last updated August 10, 2026',
    'Data handled',
    'Use',
    'Local processing',
    'Storage',
    'Sharing',
    'Analytics',
    'Authentication',
    'Permissions',
    'Chrome Web Store Limited Use',
    'Changes',
    'Contact',
    'clipboardWrite',
  ])
    assert.match(visible, new RegExp(value));
  assert.match(
    html,
    /href="https:\/\/github\.com\/postigodev\/dm2text\/issues"/,
  );
});

test('pages preserve canonical metadata and avoid hydration', async () => {
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
  assert.doesNotMatch(
    home + privacy,
    /astro-island|client:(?:load|idle|visible|media|only)/,
  );
});

test('build includes local brand and marketing assets', async () => {
  for (const path of [
    'brand/dm2text-mark.svg',
    'brand/google-chrome.svg',
    'brand/icon-32.png',
    'brand/icon-96.png',
    'brand/icon-128.png',
    'marketing/dm-example.png',
  ])
    await access(pageUrl(path));
});
