# DM2Text Repository Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish DM2Text as a branded, GPL-3.0-only, contributor-friendly repository with deterministic CI and safe tag-driven releases.

**Architecture:** Keep repository-only concerns outside the extension core: static brand and documentation assets under `docs/assets/`, extension icons under `public/`, community files under `.github/`, and dependency-free validation under `scripts/`. GitHub Actions call the same pnpm commands used locally, while repository settings are applied only after all tracked changes pass validation.

**Tech Stack:** WXT 0.21.3, Manifest V3, vanilla TypeScript, Node 24.12.0, pnpm 10.26.2, Vitest, GitHub Actions, GitHub CLI, GPL-3.0-only.

## Global Constraints

- Do not change production transcript, parsing, collection, clipboard, or UI behavior.
- Add no runtime dependency, frontend framework, analytics, telemetry, persistence, or extension-originated network request.
- Use pnpm 10.26.2 consistently and Node 24.12.0 in local metadata and workflows.
- Keep total production JavaScript below 60,000 bytes and the Chrome ZIP below 200,000 bytes.
- Use conventional commits in `type(scope): description` form.
- Never track real DMs, usernames, avatars, private thread IDs, credentials, unredacted DOM dumps, repository-external local paths, or `.superpowers/` artifacts.
- Preserve the existing `v0.1.0` tag and release exactly; do not publish a disposable version.
- Use the original Context Ribbon mark without Instagram's camera glyph, wordmark, or exact gradient.
- Keep all public documentation and templates in English.
- Preserve the unrelated untracked `docs/superpowers/plans/2026-08-04-dm2text-mvp.md`.

---

## File Map

- `.node-version`: pins the Node version shared by contributors and CI.
- `.gitignore`: excludes local visual-companion artifacts.
- `LICENSE`: verbatim GPL version 3 license text.
- `package.json`: declares author, GPL identifier, repository metadata, pnpm version, and budget commands.
- `scripts/check-budgets.mjs`: measures production JavaScript and packaged ZIP bytes.
- `scripts/check-budgets.test.mjs`: tests recursive measurement, missing outputs, and threshold failures using Node's test runner.
- `docs/assets/dm2text-mark.svg`: editable Context Ribbon source.
- `docs/assets/message-action.png`: anonymized English product capture of the native menu action.
- `docs/assets/copy-dialog.png`: isolated English product capture of the copy dialog.
- `public/icon-{16,32,48,96,128}.png`: checked-in Chromium extension icons.
- `wxt.config.ts`: maps explicit icon sizes into the generated manifest.
- `README.md`: presents the brand, product captures, badges, community links, disclaimer, and GPL notice.
- `CONTRIBUTING.md`: contributor workflow and privacy rules.
- `CODE_OF_CONDUCT.md`: Contributor Covenant 2.1 with a real enforcement address.
- `SECURITY.md`: supported-version and private-reporting policy.
- `.github/ISSUE_TEMPLATE/bug_report.yml`: privacy-safe structured bug reports.
- `.github/ISSUE_TEMPLATE/feature_request.yml`: scoped feature proposals.
- `.github/ISSUE_TEMPLATE/config.yml`: disables blank issues and routes vulnerabilities privately.
- `.github/pull_request_template.md`: focused PR verification checklist.
- `.github/workflows/ci.yml`: least-privilege push/PR validation.
- `.github/workflows/release.yml`: idempotent tag validation, packaging, and release publication.

### Task 1: License, toolchain, and package metadata

**Files:**
- Create: `.node-version`
- Create: `LICENSE`
- Modify: `.gitignore:1-3`
- Modify: `package.json:1-22`

**Interfaces:**
- Consumes: the existing `pnpm-lock.yaml` and package version `0.1.0`.
- Produces: Node `24.12.0`, pnpm `10.26.2`, SPDX identifier `GPL-3.0-only`, and npm metadata used by later workflows and badges.

- [ ] **Step 1: Record the toolchain and ignore local visual artifacts**

Use `apply_patch` to create `.node-version` with exactly:

```text
24.12.0
```

Append this entry to `.gitignore`:

```gitignore
.superpowers/
```

- [ ] **Step 2: Add deterministic package metadata**

Use `apply_patch` so the package header contains these fields while preserving the existing scripts and dependencies:

```json
{
  "name": "dm2text",
  "version": "0.1.0",
  "private": true,
  "license": "GPL-3.0-only",
  "author": "Piero A. Postigo Rocchetti",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/postigodev/dm2text.git"
  },
  "bugs": {
    "url": "https://github.com/postigodev/dm2text/issues"
  },
  "homepage": "https://github.com/postigodev/dm2text#readme",
  "keywords": [
    "browser-extension",
    "chrome-extension",
    "instagram-direct",
    "local-first",
    "manifest-v3",
    "typescript",
    "wxt"
  ],
  "packageManager": "pnpm@10.26.2",
  "type": "module"
}
```

- [ ] **Step 3: Add the canonical GPL-3.0 license text**

Fetch the canonical body read-only:

```powershell
gh api licenses/gpl-3.0 --jq .body
```

Use `apply_patch` to create `LICENSE` from that exact output without adding the project copyright inside the license body. Verify the file begins with:

```text
                    GNU GENERAL PUBLIC LICENSE
                       Version 3, 29 June 2007
```

and ends with:

```text
<https://www.gnu.org/licenses/why-not-lgpl.html>.
```

- [ ] **Step 4: Verify metadata without changing the lockfile**

Run:

```powershell
pnpm install --frozen-lockfile
node -p "require('./package.json').packageManager"
node -p "require('./package.json').license"
pnpm typecheck
git diff --check
```

Expected: installation and typecheck pass; the two Node commands print `pnpm@10.26.2` and `GPL-3.0-only`; `pnpm-lock.yaml` remains unchanged.

- [ ] **Step 5: Commit the legal and toolchain baseline**

```powershell
git add -- .node-version .gitignore LICENSE package.json
git commit -m "chore(repo): add licensing and toolchain metadata"
```

### Task 2: Dependency-free bundle budget enforcement

**Files:**
- Create: `scripts/check-budgets.mjs`
- Create: `scripts/check-budgets.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `.output/chrome-mv3/`, `.output/dm2text-<package.version>-chrome.zip`, and `package.json`.
- Produces: `measureJavaScriptBytes(root)`, `assertBelow(label, measured, limit)`, `resolveExpectedZip(root)`, plus `pnpm check:budget:js`, `pnpm check:budgets`, and `pnpm test:budgets`.

- [ ] **Step 1: Write failing budget tests**

Create `scripts/check-budgets.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test scripts/check-budgets.test.mjs
```

Expected: FAIL because `scripts/check-budgets.mjs` does not exist.

- [ ] **Step 3: Implement the budget checker**

Create `scripts/check-budgets.mjs`:

```js
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
```

- [ ] **Step 4: Add package commands**

Add these scripts without removing the existing ones:

```json
"check:budget:js": "node scripts/check-budgets.mjs --scope=js",
"check:budgets": "node scripts/check-budgets.mjs",
"test:budgets": "node --test scripts/check-budgets.test.mjs"
```

- [ ] **Step 5: Run narrow and integrated validation**

```powershell
pnpm test:budgets
pnpm build
pnpm check:budget:js
pnpm zip
pnpm check:budgets
```

Expected: 3 Node tests pass; JavaScript reports about 36 KB of 60,000 bytes; the ZIP reports about 12 KB of 200,000 bytes.

- [ ] **Step 6: Commit budget enforcement**

```powershell
git add -- package.json scripts/check-budgets.mjs scripts/check-budgets.test.mjs
git commit -m "ci(budgets): enforce extension size limits"
```

### Task 3: Context Ribbon assets and extension icons

**Files:**
- Create: `docs/assets/dm2text-mark.svg`
- Create: `public/icon-16.png`
- Create: `public/icon-32.png`
- Create: `public/icon-48.png`
- Create: `public/icon-96.png`
- Create: `public/icon-128.png`
- Modify: `wxt.config.ts:3-9`

**Interfaces:**
- Consumes: the approved Context Ribbon geometry and WXT's `manifest.icons` map.
- Produces: one editable vector mark and explicit raster manifest icons with no build-time dependency.

- [ ] **Step 1: Add the editable mark**

Create `docs/assets/dm2text-mark.svg` exactly as an original scalable mark:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 82 82" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="title description">
  <title id="title">DM2Text Context Ribbon</title>
  <desc id="description">A white conversation ribbon on a warm rounded square.</desc>
  <defs>
    <linearGradient id="ribbon" x1="10" y1="9" x2="72" y2="72" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ff756b"/>
      <stop offset="0.48" stop-color="#d65e9e"/>
      <stop offset="1" stop-color="#7558d8"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="74" height="74" rx="25" fill="url(#ribbon)"/>
  <path fill="#fff" fill-opacity="0.96" d="M23 26h31a8 8 0 0 1 8 8v11a8 8 0 0 1-8 8H40L29 62v-9h-6a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8Z"/>
  <path fill="none" stroke="#8b4aa9" stroke-linecap="round" stroke-width="4" d="M27 36h23M27 43h18"/>
</svg>
```

- [ ] **Step 2: Render exact PNG sizes from the SVG**

Use the installed Chrome executable in headless mode; do not add a rasterization dependency:

```powershell
$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)
$chromePath = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (!$chromePath) { throw 'Chrome executable not found.' }
$repoRoot = (Resolve-Path .).Path
$sourceUri = [Uri]::new((Resolve-Path docs\assets\dm2text-mark.svg).Path).AbsoluteUri
foreach ($size in 16, 32, 48, 96, 128) {
  $output = Join-Path $repoRoot "public\icon-$size.png"
  & $chromePath --headless --disable-gpu --hide-scrollbars `
    --force-device-scale-factor=1 --default-background-color=00000000 `
    "--window-size=$size,$size" "--screenshot=$output" $sourceUri
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Use `view_image` on `public/icon-128.png`. Confirm the shape matches Context Ribbon and retains transparent outer corners. If headless Chrome clips the SVG, stop and correct the SVG viewport before committing; do not substitute an Instagram mark.

- [ ] **Step 3: Map icons explicitly in WXT**

Update `wxt.config.ts`:

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'DM2Text',
    description: 'Copy structured context from Instagram Direct.',
    permissions: ['clipboardWrite'],
    icons: {
      16: '/icon-16.png',
      32: '/icon-32.png',
      48: '/icon-48.png',
      96: '/icon-96.png',
      128: '/icon-128.png',
    },
  },
});
```

- [ ] **Step 4: Verify generated manifest and artifacts**

```powershell
pnpm build
$manifest = Get-Content -Raw .output\chrome-mv3\manifest.json | ConvertFrom-Json
$manifest.icons | ConvertTo-Json
foreach ($size in 16, 32, 48, 96, 128) {
  if (!(Test-Path ".output\chrome-mv3\icon-$size.png")) { throw "Missing icon-$size.png" }
}
pnpm zip
pnpm check:budgets
```

Expected: manifest maps all five sizes, all output files exist, and both budgets pass.

- [ ] **Step 5: Commit the identity assets**

```powershell
git add -- docs/assets/dm2text-mark.svg public/icon-16.png public/icon-32.png public/icon-48.png public/icon-96.png public/icon-128.png wxt.config.ts
git commit -m "feat(brand): add Context Ribbon identity"
```

### Task 4: Contributor and community health files

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `SECURITY.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/pull_request_template.md`

**Interfaces:**
- Consumes: existing architecture, pnpm commands, privacy rules, and GPL metadata.
- Produces: one explicit contribution path, private security routing, structured issues, and a PR acceptance checklist.

- [ ] **Step 1: Add the contribution guide**

Create `CONTRIBUTING.md` with these exact sections and requirements:

```markdown
# Contributing to DM2Text

Thanks for helping improve DM2Text. Keep contributions focused on copying structured Instagram Direct context safely and locally.

## Before you start

- Search existing issues before opening a new one.
- Discuss behavioral changes in an issue before writing a large patch.
- Never post or commit real DMs, usernames, avatars, thread IDs, session data, credentials, or unredacted DOM captures.

## Development

Use Node 24.12.0 and pnpm 10.26.2.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Load `.output/chrome-mv3-dev` as an unpacked Chromium extension.

Instagram-specific DOM logic belongs in `src/instagram/`. Collection, transcript, and UI behavior remain isolated in their existing directories. Keep selectors centralized and add no runtime dependency or extension-originated network request.

## Tests and validation

```powershell
pnpm test
pnpm test:budgets
pnpm typecheck
pnpm build
pnpm check:budget:js
pnpm zip
pnpm check:budgets
```

Use deterministic tests and anonymized HTML fixtures. Missing DOM data is recoverable. Never log message content in production.

## Commits and pull requests

Use `type(scope): description`, for example `fix(instagram): preserve emoji messages`.

Keep pull requests small, explain user-visible behavior, list validation performed, and disclose privacy, network, or bundle-size impact. Generated `.output/`, local `.superpowers/`, and real conversation material must stay untracked.

By submitting a contribution, you agree that it is licensed under GPL-3.0-only.
```

- [ ] **Step 2: Adopt Contributor Covenant 2.1 without placeholders**

Open the canonical Markdown source at:

```text
https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md
```

Use `apply_patch` to create `CODE_OF_CONDUCT.md` from that exact source. Replace `[INSERT CONTACT METHOD]` with `ppostigorocchetti@gmail.com`, retain the version 2.1 attribution, and verify:

```powershell
Select-String -Path CODE_OF_CONDUCT.md -Pattern 'INSERT|ppostigorocchetti@gmail.com|version 2.1'
```

Expected: the email and attribution match; no `INSERT` match exists.

- [ ] **Step 3: Add the security policy**

Create `SECURITY.md`:

```markdown
# Security policy

## Supported versions

Only the latest published DM2Text release receives security updates during the MVP phase.

## Report a vulnerability

Use [GitHub Private Vulnerability Reporting](https://github.com/postigodev/dm2text/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Describe the impact and provide the smallest reproducible steps. Never include real Instagram messages, usernames, thread IDs, cookies, session material, credentials, or unredacted DOM captures. Use synthetic or fully anonymized evidence.

The maintainer will acknowledge a report when practical, investigate it privately, and coordinate disclosure after a fix is available. No resolution timeline is guaranteed.
```

- [ ] **Step 4: Add privacy-safe issue forms**

Create `.github/ISSUE_TEMPLATE/bug_report.yml`:

```yaml
name: Bug report
description: Report reproducible incorrect behavior without sharing private conversation data.
title: "[Bug]: "
labels: [bug]
body:
  - type: markdown
    attributes:
      value: "Do not include real DMs, usernames, avatars, thread IDs, cookies, credentials, or unredacted DOM. Use synthetic or fully anonymized evidence."
  - type: input
    id: version
    attributes:
      label: DM2Text version
      placeholder: v0.1.0
    validations:
      required: true
  - type: input
    id: browser
    attributes:
      label: Browser and version
      placeholder: Chrome 140
    validations:
      required: true
  - type: dropdown
    id: conversation
    attributes:
      label: Conversation type
      options: [Individual DM, Group DM, Both, Not applicable]
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Reproduction steps
      description: Use synthetic names and messages.
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual behavior
    validations:
      required: true
  - type: checkboxes
    id: privacy
    attributes:
      label: Privacy confirmation
      options:
        - label: I removed or anonymized all private conversation and account data.
          required: true
```

Create `.github/ISSUE_TEMPLATE/feature_request.yml`:

```yaml
name: Feature request
description: Propose a focused improvement to DM2Text.
title: "[Feature]: "
labels: [enhancement]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What user need is not currently met?
    validations:
      required: true
  - type: textarea
    id: outcome
    attributes:
      label: Proposed outcome
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
  - type: textarea
    id: impact
    attributes:
      label: Privacy and performance impact
      description: Note any DOM scanning, storage, network, permission, or bundle-size implications.
    validations:
      required: true
```

Create `.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Private vulnerability report
    url: https://github.com/postigodev/dm2text/security/advisories/new
    about: Report security issues privately and never include real conversation data.
```

- [ ] **Step 5: Add the pull request checklist**

Create `.github/pull_request_template.md`:

```markdown
## Summary

Describe the focused change and link its issue when applicable.

## Validation

- [ ] Tests pass.
- [ ] Typecheck passes.
- [ ] Production build and ZIP pass.
- [ ] JavaScript and packaged-extension budgets pass.
- [ ] Manual Instagram verification was performed when DOM or UI behavior changed.

## Safety

- [ ] No real messages, usernames, avatars, thread IDs, credentials, or unredacted DOM were added.
- [ ] No persistence, extension-originated network request, runtime dependency, or new permission was introduced; otherwise the change explains and justifies it explicitly.
- [ ] Fixtures and screenshots are synthetic or fully anonymized.
- [ ] Documentation and release-note impact is described.
```

- [ ] **Step 6: Validate and commit community files**

```powershell
$placeholderPattern = @('T' + 'BD', 'TO' + 'DO', 'INSERT CONTACT', 'real-thread-id') -join '|'
git grep -n -E $placeholderPattern -- CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md .github
pnpm test
pnpm typecheck
git diff --check
```

Expected: grep returns no matches; tests and typecheck pass.

```powershell
git add -- CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md .github/ISSUE_TEMPLATE .github/pull_request_template.md
git commit -m "docs(community): add contribution and security guidance"
```

### Task 5: README branding and authentic product captures

**Files:**
- Create: `docs/assets/message-action.png`
- Create: `docs/assets/copy-dialog.png`
- Modify: `README.md:1-85`

**Interfaces:**
- Consumes: the live English extension UI, Context Ribbon SVG, repository links, and community files.
- Produces: a privacy-safe GitHub presentation with functional badges and two authentic screenshots.

- [ ] **Step 1: Capture the real menu action safely**

Run `pnpm dev`, load `.output/chrome-mv3-dev`, set Instagram's interface language to English, and use one locally selected conversation. Open a message menu that contains only native action labels plus `Copy context`.

Capture only the menu rectangle into `docs/assets/message-action.png`. The image must show `Forward`, `Copy`, `Translate`, `Pin`, `Report`, and `Copy context`; crop out the message timestamp and all conversation background. Use `view_image` to verify there is no message, username, avatar, or thread identifier.

- [ ] **Step 2: Capture the real dialog safely**

Open `Copy context` and capture the isolated dialog into `docs/assets/copy-dialog.png`. It must show `Copy context`, `Ends at the selected message`, `Messages to include`, `Cancel`, and `Copy` in English. Crop away all background outside the dialog's bounding box and verify it with `view_image`.

If either live capture cannot exclude identifying background, render a documentation-only composite from the extension's current CSS, icons, and English strings; do not commit a private screenshot or a repository-external path.

- [ ] **Step 3: Replace the README header**

Use this centered header before `## Features`:

```markdown
<div align="center">
  <img src="docs/assets/dm2text-mark.svg" alt="DM2Text Context Ribbon logo" width="96" />
  <h1>DM2Text</h1>
  <p>Copy clean, structured context from Instagram Direct—without sending your conversations anywhere.</p>
  <p>
    <a href="https://github.com/postigodev/dm2text/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/postigodev/dm2text" /></a>
    <a href="https://github.com/postigodev/dm2text/actions/workflows/ci.yml"><img alt="CI status" src="https://github.com/postigodev/dm2text/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="LICENSE"><img alt="GPL-3.0-only license" src="https://img.shields.io/github/license/postigodev/dm2text" /></a>
    <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&amp;logoColor=white" />
  </p>
</div>

DM2Text adds a native-looking **Copy context** action to each message menu. Select an end message, choose how many messages you need, and the extension collects the preceding context into a chronological transcript on your clipboard.
```

- [ ] **Step 4: Add the approved product demonstration**

Insert this block after the feature list:

```markdown
## See it in action

One native-looking action opens one focused copy session.

<table>
  <tr>
    <td align="center"><img src="docs/assets/message-action.png" alt="Copy context in the Instagram message action menu" /></td>
    <td align="center"><img src="docs/assets/copy-dialog.png" alt="DM2Text message-count dialog" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Choose Copy context on the anchor message.</sub></td>
    <td align="center"><sub>Enter the number of messages and start the copy session.</sub></td>
  </tr>
</table>
```

- [ ] **Step 5: Add community, independence, and GPL notices**

Append before `## Limitations`:

```markdown
## Community

Contributions are welcome. Read the [contribution guide](CONTRIBUTING.md), [code of conduct](CODE_OF_CONDUCT.md), and [security policy](SECURITY.md) before opening an issue or pull request.

DM2Text is an independent project and is not affiliated with, endorsed by, or sponsored by Instagram or Meta.

## License

Copyright © 2026 Piero A. Postigo Rocchetti. DM2Text is licensed under [GPL-3.0-only](LICENSE).
```

- [ ] **Step 6: Verify README assets and privacy**

```powershell
$readme = Get-Content -Raw README.md
foreach ($path in 'docs/assets/dm2text-mark.svg','docs/assets/message-action.png','docs/assets/copy-dialog.png','CONTRIBUTING.md','CODE_OF_CONDUCT.md','SECURITY.md','LICENSE') {
  if (!(Test-Path $path)) { throw "Missing README target: $path" }
}
git grep -n -E 'instagram\.com/direct/t/|real-thread-id|AppData|codex-clipboard' -- README.md docs/assets
pnpm test
pnpm typecheck
pnpm build
pnpm check:budget:js
```

Expected: no privacy/path grep matches; all validation passes. Inspect the rendered README in GitHub light and dark themes before publication.

- [ ] **Step 7: Commit public presentation**

```powershell
git add -- README.md docs/assets/dm2text-mark.svg docs/assets/message-action.png docs/assets/copy-dialog.png
git commit -m "docs(readme): add branded project presentation"
```

### Task 6: CI and tag-driven release workflows

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `.node-version`, `packageManager`, budget scripts, WXT build/ZIP commands, and GitHub's release API.
- Produces: least-privilege CI for `main` and digest-safe publication for tags matching `v*`.

- [ ] **Step 1: Add continuous integration**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: 10.26.2
          run_install: false
      - uses: actions/setup-node@v7
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm test:budgets
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm check:budget:js
      - run: pnpm zip
      - run: pnpm check:budgets
```

- [ ] **Step 2: Add tag-driven release validation and packaging**

Create `.github/workflows/release.yml` with this trigger, permission, setup, and validation body:

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions: {}

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: 10.26.2
          run_install: false
      - uses: actions/setup-node@v7
        with:
          node-version-file: .node-version
          cache: pnpm
      - name: Validate tag and package version
        shell: bash
        run: |
          expected="v$(node -p "require('./package.json').version")"
          if [[ "$GITHUB_REF_NAME" != "$expected" ]]; then
            echo "Tag $GITHUB_REF_NAME does not match package version $expected." >&2
            exit 1
          fi
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm test:budgets
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm check:budget:js
      - run: pnpm zip
      - run: pnpm check:budgets
      - name: Publish release asset safely
        shell: bash
        run: |
          version="${GITHUB_REF_NAME#v}"
          asset=".output/dm2text-${version}-chrome.zip"
          asset_name="$(basename "$asset")"
          label="DM2Text ${GITHUB_REF_NAME} for Chrome"
          local_digest="sha256:$(sha256sum "$asset" | cut -d ' ' -f1)"

          if ! gh release view "$GITHUB_REF_NAME" >/dev/null 2>&1; then
            gh release create "$GITHUB_REF_NAME" "$asset#$label" \
              --target "$GITHUB_SHA" \
              --title "DM2Text $GITHUB_REF_NAME" \
              --generate-notes \
              --latest
            exit 0
          fi

          target="$(gh release view "$GITHUB_REF_NAME" --json targetCommitish --jq .targetCommitish)"
          if [[ "$target" != "$GITHUB_SHA" ]]; then
            echo "Existing release targets $target instead of $GITHUB_SHA." >&2
            exit 1
          fi

          remote_digest="$(gh release view "$GITHUB_REF_NAME" --json assets --jq ".assets[] | select(.name == \"$asset_name\") | .digest")"
          if [[ -z "$remote_digest" ]]; then
            gh release upload "$GITHUB_REF_NAME" "$asset#$label"
          elif [[ "$remote_digest" == "$local_digest" ]]; then
            echo "Release asset already exists with matching digest."
          else
            echo "Release asset digest conflict: remote=$remote_digest local=$local_digest" >&2
            exit 1
          fi
```

- [ ] **Step 3: Exercise every pre-publication path locally**

Run:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm test:budgets
pnpm typecheck
pnpm build
pnpm check:budget:js
pnpm zip
pnpm check:budgets
$expected = "v$((Get-Content -Raw package.json | ConvertFrom-Json).version)"
if ($expected -ne 'v0.1.0') { throw "Unexpected version: $expected" }
git diff --check
```

Inspect both YAML files for the exact event filters and permissions. Do not push a disposable tag and do not rerun against `v0.1.0`.

- [ ] **Step 4: Commit automation**

```powershell
git add -- .github/workflows/ci.yml .github/workflows/release.yml
git commit -m "ci(github): automate validation and tagged releases"
```

### Task 7: Publish `main` and apply GitHub repository settings

**Files:**
- No tracked file changes.

**Interfaces:**
- Consumes: the fully validated local commit series and existing `origin` remote.
- Produces: `main` as the only active default branch, public repository metadata, working CI, and private vulnerability reporting.

- [ ] **Step 1: Audit the exact pre-publication state**

```powershell
git status --short --branch
git log --oneline --decorate -8
git remote -v
git ls-remote --heads origin
gh repo view postigodev/dm2text --json defaultBranchRef,url,visibility
gh release view v0.1.0 --repo postigodev/dm2text --json tagName,url,targetCommitish,assets
```

Expected: only the unrelated MVP plan remains untracked; local commits are ahead of `origin/feat/dm2text-mvp`; `v0.1.0` still exists.

- [ ] **Step 2: Run the complete local release gate**

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm test:budgets
pnpm typecheck
pnpm build
pnpm check:budget:js
pnpm zip
pnpm check:budgets
git diff --check
```

Expected: every command passes and the unrelated untracked plan is unchanged.

- [ ] **Step 3: Rename and publish the branch without deleting the old branch yet**

```powershell
git branch -m main
git push -u origin main
gh repo edit postigodev/dm2text --default-branch main --enable-issues=true --enable-wiki=false --enable-projects=false
```

- [ ] **Step 4: Apply topics and private vulnerability reporting**

```powershell
gh repo edit postigodev/dm2text `
  --add-topic browser-extension `
  --add-topic chrome-extension `
  --add-topic instagram-direct `
  --add-topic local-first `
  --add-topic privacy `
  --add-topic typescript `
  --add-topic wxt `
  --add-topic manifest-v3
gh api --method PUT repos/postigodev/dm2text/private-vulnerability-reporting
```

- [ ] **Step 5: Verify repository settings before removing any branch**

```powershell
$repo = gh repo view postigodev/dm2text --json defaultBranchRef,repositoryTopics,hasIssuesEnabled,hasWikiEnabled,hasProjectsEnabled | ConvertFrom-Json
if ($repo.defaultBranchRef.name -ne 'main') { throw 'GitHub default branch is not main.' }
if ($repo.hasWikiEnabled -or $repo.hasProjectsEnabled -or !$repo.hasIssuesEnabled) { throw 'Repository feature settings are incorrect.' }
$expectedTopics = 'browser-extension','chrome-extension','instagram-direct','local-first','privacy','typescript','wxt','manifest-v3'
$actualTopics = @($repo.repositoryTopics.name)
foreach ($topic in $expectedTopics) {
  if ($topic -notin $actualTopics) { throw "Missing repository topic: $topic" }
}
git ls-remote --heads origin main
```

Do not delete `feat/dm2text-mvp` yet. Continue only after GitHub reports `main` as default, every topic is present, and the remote `main` head resolves.

- [ ] **Step 6: Watch CI, remove the obsolete branch, and verify public state**

```powershell
$runId = gh run list --repo postigodev/dm2text --workflow CI --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $runId --repo postigodev/dm2text --exit-status
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git push origin --delete feat/dm2text-mvp
gh repo view postigodev/dm2text --json defaultBranchRef,repositoryTopics,hasIssuesEnabled,hasWikiEnabled,hasProjectsEnabled,url
gh api repos/postigodev/dm2text --jq .security_and_analysis.private_vulnerability_reporting.status
gh release view v0.1.0 --repo postigodev/dm2text --json tagName,url,assets
git status --short --branch
git ls-remote --heads origin
```

Expected: CI succeeds before deletion; `main` is default and tracked locally; eight topics are present; Issues are enabled; Wiki and Projects are disabled; private vulnerability reporting is `enabled`; the existing release and asset remain unchanged; the obsolete remote feature branch is absent.

---

## Final Verification Checklist

- [ ] GPL text is canonical, package metadata says `GPL-3.0-only`, and the README shows the correct copyright holder.
- [ ] Context Ribbon appears in the README and generated manifest; all raster sizes exist.
- [ ] Product captures contain only English, non-identifying UI.
- [ ] Contribution, conduct, security, issue, and PR guidance is linked and contains no placeholders.
- [ ] Existing 119 tests, budget tests, typecheck, build, ZIP, and both size budgets pass.
- [ ] CI uses read-only contents permission; only the release job uses contents write.
- [ ] No fake tag or replacement of `v0.1.0` occurred.
- [ ] GitHub `main`, topics, repository features, security reporting, and CI are verified live.
- [ ] Only the pre-existing unrelated MVP plan remains untracked.
