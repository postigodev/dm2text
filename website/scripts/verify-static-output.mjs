import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const requiredFiles = [
  'index.html',
  'privacy/index.html',
  'brand/dm2text-mark.svg',
  'brand/icon-32.png',
  'brand/icon-96.png',
  'brand/icon-128.png',
];

for (const path of requiredFiles) await access(new URL(path, dist));

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const child = new URL(
          `${entry.name}${entry.isDirectory() ? '/' : ''}`,
          directory,
        );
        return entry.isDirectory() ? walk(child) : [child];
      }),
    )
  ).flat();
};

const files = await walk(dist);
const scriptFiles = files.filter((url) => /\.(?:m?js)$/.test(url.pathname));
assert.deepEqual(
  scriptFiles.map((url) => url.pathname),
  [],
  'Static website unexpectedly emitted client JavaScript',
);

const home = await readFile(new URL('index.html', dist), 'utf8');
const privacy = await readFile(new URL('privacy/index.html', dist), 'utf8');
assert.match(home, /https:\/\/dm2text\.postigo\.sh\//);
assert.match(privacy, /https:\/\/dm2text\.postigo\.sh\/privacy\//);

console.log(
  `Verified ${requiredFiles.length} required static files and zero client JavaScript bundles.`,
);
