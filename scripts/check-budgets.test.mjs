import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertBelow,
  measureJavaScriptBytes,
  resolveExpectedZip,
} from './check-budgets.mjs';

test('measureJavaScriptBytes sums only JavaScript recursively', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dm2text-budget-'));
  try {
    await mkdir(join(root, 'nested'));
    await writeFile(join(root, 'one.js'), '1234');
    await writeFile(join(root, 'nested', 'two.js'), '123456');
    await writeFile(join(root, 'ignored.css'), '123456789');
    assert.equal(await measureJavaScriptBytes(root), 10);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('assertBelow rejects a value equal to the strict limit', () => {
  assert.throws(
    () => assertBelow('JavaScript', 60_000, 60_000),
    /JavaScript is 60000 bytes; limit is below 60000 bytes/,
  );
});

test('resolveExpectedZip derives the archive from package version', () => {
  assert.equal(
    resolveExpectedZip('C:/repo', '0.1.0'),
    join('C:/repo', '.output', 'dm2text-0.1.0-chrome.zip'),
  );
});
