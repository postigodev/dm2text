import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const JAVASCRIPT_LIMIT = 60_000;
const ZIP_LIMIT = 200_000;

export async function measureJavaScriptBytes(root) {
  const entries = await readdir(root, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) total += await measureJavaScriptBytes(path);
    if (entry.isFile() && entry.name.endsWith('.js')) {
      total += (await stat(path)).size;
    }
  }

  return total;
}

export function assertBelow(label, measured, limit) {
  if (measured >= limit) {
    throw new Error(
      `${label} is ${measured} bytes; limit is below ${limit} bytes.`,
    );
  }
}

export function resolveExpectedZip(root, version) {
  return join(root, '.output', `dm2text-${version}-chrome.zip`);
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const packageJson = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'),
  );
  const scope = process.argv.includes('--scope=js') ? 'js' : 'all';
  const javascriptBytes = await measureJavaScriptBytes(
    join(root, '.output', 'chrome-mv3'),
  );
  assertBelow('JavaScript', javascriptBytes, JAVASCRIPT_LIMIT);
  console.log(`JavaScript: ${javascriptBytes}/${JAVASCRIPT_LIMIT} bytes`);

  if (scope === 'all') {
    const zip = resolveExpectedZip(root, packageJson.version);
    const zipBytes = (await stat(zip)).size;
    assertBelow('Packaged extension', zipBytes, ZIP_LIMIT);
    console.log(`Packaged extension: ${zipBytes}/${ZIP_LIMIT} bytes`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
