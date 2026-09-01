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
  const messageRow = (key) =>
    html.match(
      new RegExp(`<div class="message-row [^"]+"[^>]*data-key="${key}"[^>]*>`),
    )?.[0] ?? '';
  const css = (
    await Promise.all(
      [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(
        ([, href]) => readFile(pageUrl(href.slice(1)), 'utf8'),
      ),
    )
  ).join('\n');
  assert.match(html, /href="\/privacy\/"/);
  assert.match(html, /https:\/\/github\.com\/postigodev\/dm2text/);
  assert.match(html, /data-dm2text-demo/);
  assert.match(html, /data-message-count="156"/);
  assert.match(html, /data-copy-context/);
  assert.match(html, /data-unsend/);
  assert.match(html, /data-composer/);
  assert.match(html, /data-add-photo/);
  assert.match(html, /data-add-reel/);
  assert.match(html, /data-message-template="text"/);
  assert.match(html, /data-message-template="media"/);
  assert.match(html, /data-message-template="shared-post"/);
  assert.match(html, /data-count-input/);
  assert.match(html, /data-paste-zone/);
  assert.match(html, /navigator\.clipboard\?\.writeText/);
  assert.match(css, /\.message-row\s*\{[^}]*flex:\s*none;/s);
  assert.doesNotMatch(html, /src="\/marketing\/dm-example\.png"/);
  assert.doesNotMatch(html, /images\.unsplash\.com/);
  assert.match(html, /src="\/brand\/google-chrome\.svg"/);
  assert.match(
    html,
    /href="https:\/\/chromewebstore\.google\.com\/detail\/dm2text\/gpedpddbcooaomkehnmpcjjghnbknpbd"/,
  );
  assert.match(visible, /clara\.zk Clara Z\./);
  assert.doesNotMatch(messageRow('seed-4'), /data-avatar-visible/);
  assert.match(messageRow('seed-5'), /data-avatar-visible/);
  assert.match(html, /updateMessageGroups/);
  assert.match(visible, /Tuesday 9:18 AM .*did you export the new version/);
  assert.match(html, /data-text="professional operation we're running here"/);
  assert.match(visible, /Swiss posters from the 1970s/);
  assert.match(visible, /Wednesday 8:03 AM .*awake\?/);
  assert.match(visible, /you absolutely know/);
  assert.match(visible, /Copy context/);
  assert.match(visible, /Messages to include/);
  assert.match(visible, /pasteboard\.txt plain text/);
  assert.match(visible, /Nothing is inserted here automatically\./);
  assert.match(
    visible,
    /copies part of an Instagram Direct conversation as plain text/,
  );
  assert.doesNotMatch(visible, /Manual install via GitHub/);
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
  assert.match(
    html,
    /href="https:\/\/chromewebstore\.google\.com\/detail\/dm2text\/gpedpddbcooaomkehnmpcjjghnbknpbd"/,
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

test('build includes local brand and unique demo media assets', async () => {
  for (const path of [
    'brand/dm2text-mark.svg',
    'brand/google-chrome.svg',
    'brand/icon-32.png',
    'brand/icon-96.png',
    'brand/icon-128.png',
    'marketing/dm-example.png',
    'demo/clara-z.webp',
    'demo/poster-mockup.webp',
    'demo/finished-poster.webp',
    'demo/printed-posters.webp',
    'demo/swiss-posters-reel.webp',
    'demo/archival-flyer.webp',
    'demo/cat-keyboard-reel.webp',
    'demo/composer-photo.webp',
    'demo/composer-reel.webp',
  ])
    await access(pageUrl(path));
});

test('canonical seeded media uses one distinct local asset per event', async () => {
  const html = await readFile(pageUrl('index.html'), 'utf8');
  const seededAssets = [
    'poster-mockup.webp',
    'finished-poster.webp',
    'printed-posters.webp',
    'swiss-posters-reel.webp',
    'archival-flyer.webp',
    'cat-keyboard-reel.webp',
  ];

  for (const asset of seededAssets) {
    assert.equal(html.match(new RegExp(`/demo/${asset}`, 'g'))?.length, 1);
  }
  assert.match(html, /data-source="design\.archive"/);
  assert.match(html, /data-source="catworkers"/);
});
