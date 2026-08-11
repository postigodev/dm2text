# DM2Text Marketing Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a polished, fully static two-route DM2Text marketing website under `website/` for deployment to `https://dm2text.postigo.sh`.

**Architecture:** Keep the website as an independently installable Astro project so the extension's WXT package, dependencies, and build remain untouched. Astro renders presentational components to static HTML; Tailwind CSS v4 supplies styling without hydration, a single typed config owns public URLs, and a Node test inspects the built output for routes, metadata, required content, local assets, and absence of client bundles.

**Tech Stack:** Astro, TypeScript, Tailwind CSS v4 through `@tailwindcss/vite`, `@tailwindcss/typography`, `@lucide/astro`, Prettier, `@astrojs/check`, Node's built-in test runner, pnpm 10.26.2, Vercel static hosting.

## Global Constraints

- Treat `docs/superpowers/specs/2026-08-10-dm2text-marketing-website-design.md` as the approved source of truth.
- Create all application code and website-specific tooling under `website/`.
- Do not modify extension source, WXT configuration, root `package.json`, root `pnpm-lock.yaml`, or extension behavior.
- Author exactly two application routes: `/` and `/privacy`.
- Use Astro, TypeScript, Tailwind CSS v4, `@lucide/astro`, and `@tailwindcss/typography`.
- Do not add React, Next.js, shadcn/ui, Framer Motion, GSAP, a backend, analytics, trackers, external APIs, remote fonts, or client hydration.
- Generate completely static output in `website/dist/`.
- Use `https://dm2text.postigo.sh` for canonical URLs.
- Reuse the existing DM2Text mark and PNG icons byte-for-byte; do not redesign them.
- Keep `CHROME_WEB_STORE_URL` in `website/src/config.ts`. It initially points to `https://github.com/postigodev/dm2text/releases/latest`.
- While the GitHub fallback is active, every **Add to Chrome** CTA visibly discloses manual installation through GitHub.
- Preserve the owner-approved privacy policy text verbatim.
- All commits use `type(scope): description` Conventional Commit format.
- Preserve the pre-existing untracked `docs/superpowers/plans/2026-08-04-dm2text-mvp.md`.

---

## File map

```text
website/
├── public/
│   └── brand/
│       ├── dm2text-mark.svg
│       ├── icon-32.png
│       ├── icon-96.png
│       └── icon-128.png
├── scripts/
│   └── verify-static-output.mjs
├── src/
│   ├── components/
│   │   ├── ChromeCta.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── HeroMockup.astro
│   │   ├── HowItWorks.astro
│   │   ├── OpenSource.astro
│   │   ├── PrivacyCallout.astro
│   │   └── TranscriptExample.astro
│   ├── content/
│   │   └── privacy-policy.md
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── privacy.astro
│   ├── styles/
│   │   └── global.css
│   └── config.ts
├── tests/
│   └── site-output.test.mjs
├── .gitignore
├── .prettierignore
├── .prettierrc.mjs
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── README.md
└── tsconfig.json
```

`src/config.ts` owns public URLs and fallback state. `BaseLayout.astro` owns the
HTML document and route metadata. `ChromeCta.astro` guarantees consistent CTA
copy and fallback disclosure. Page-section components remain presentational.
`privacy-policy.md` is the single verbatim source for public policy copy.
`site-output.test.mjs` validates the actual static artifact rather than source
implementation details.

---

### Task 1: Scaffold the isolated static Astro project

**Files:**
- Create: `website/package.json`
- Create: `website/astro.config.mjs`
- Create: `website/tsconfig.json`
- Create: `website/.gitignore`
- Create: `website/.prettierignore`
- Create: `website/.prettierrc.mjs`
- Create: `website/src/config.ts`
- Create: `website/src/styles/global.css`
- Create: `website/tests/site-output.test.mjs`
- Create: `website/src/pages/index.astro`
- Create: `website/src/pages/privacy.astro`
- Generate: `website/pnpm-lock.yaml`

**Interfaces:**
- Consumes: approved domain and repository URLs from the design specification.
- Produces: `SITE_URL`, `GITHUB_URL`, `ISSUES_URL`, `GITHUB_RELEASES_URL`, `CHROME_WEB_STORE_URL`, `IS_MANUAL_INSTALL`; `pnpm build`; `pnpm check`; `pnpm test:output`; `pnpm verify`.

- [ ] **Step 1: Create the project manifest and tool configuration**

Create `website/package.json`:

```json
{
  "name": "dm2text-website",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.26.2",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test:output": "node --test tests/site-output.test.mjs",
    "verify": "pnpm format:check && pnpm check && pnpm build && pnpm test:output"
  },
  "dependencies": {
    "@lucide/astro": "latest",
    "astro": "latest"
  },
  "devDependencies": {
    "@astrojs/check": "latest",
    "@tailwindcss/typography": "latest",
    "@tailwindcss/vite": "latest",
    "prettier": "latest",
    "prettier-plugin-astro": "latest",
    "tailwindcss": "latest",
    "typescript": "^6.0.0"
  }
}
```

Create `website/tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

Create `website/.gitignore`:

```text
node_modules/
dist/
.astro/
```

Create `website/.prettierignore`:

```text
node_modules/
dist/
.astro/
public/brand/
```

Ignoring `public/brand/` prevents Prettier from rewriting the copied SVG and
preserves the approved icon byte-for-byte.

Create `website/.prettierrc.mjs`:

```js
/** @type {import('prettier').Config} */
export default {
  plugins: ['prettier-plugin-astro'],
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
  singleQuote: true,
  trailingComma: 'all',
};
```

- [ ] **Step 2: Define the single source of public URL configuration**

Create `website/src/config.ts`:

```ts
export const SITE_URL = 'https://dm2text.postigo.sh';
export const GITHUB_URL = 'https://github.com/postigodev/dm2text';
export const ISSUES_URL = `${GITHUB_URL}/issues`;
export const GITHUB_RELEASES_URL = `${GITHUB_URL}/releases/latest`;

// Replace only this value when the public Chrome Web Store listing is live.
export const CHROME_WEB_STORE_URL = GITHUB_RELEASES_URL;

export const IS_MANUAL_INSTALL =
  CHROME_WEB_STORE_URL === GITHUB_RELEASES_URL;

export const HOME_TITLE =
  'DM2Text — Copy Instagram DMs as structured text';
export const HOME_DESCRIPTION =
  'Copy clean, structured context from Instagram Direct without sending your conversations anywhere. Local-first and open source.';
```

Create `website/astro.config.mjs`:

```js
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { SITE_URL } from './src/config.ts';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  build: { format: 'directory' },
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 3: Add the Tailwind v4 entry stylesheet**

Create `website/src/styles/global.css`:

```css
@import 'tailwindcss';
@plugin '@tailwindcss/typography';

@theme {
  --color-canvas: #faf9f6;
  --color-ink: #15182d;
  --color-muted: #666a7b;
  --color-line: #e6e2eb;
  --color-night: #111526;
  --color-accent-rose: #d85b98;
  --color-accent-violet: #7454da;
  --font-sans:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', sans-serif;
}

@layer base {
  html {
    scroll-behavior: smooth;
    background: var(--color-canvas);
  }

  body {
    margin: 0;
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
    text-rendering: optimizeLegibility;
  }

  a,
  button {
    -webkit-tap-highlight-color: transparent;
  }

  :focus-visible {
    outline: 3px solid #7454da;
    outline-offset: 3px;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Write the first failing static-output test**

Create `website/tests/site-output.test.mjs`:

```js
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const distUrl = new URL('../dist/', import.meta.url);

const pageUrl = (path) => new URL(path, distUrl);
const visibleText = (html) =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
```

- [ ] **Step 5: Install dependencies and verify the test fails before pages exist**

Run from `website/`:

```powershell
pnpm install
pnpm test:output
```

Expected: dependency installation creates `website/pnpm-lock.yaml`; the test
fails with `ENOENT` because `dist/index.html` does not exist.

- [ ] **Step 6: Add the minimal static pages**

Create `website/src/pages/index.astro`:

```astro
---
import '../styles/global.css';
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>DM2Text</title>
  </head>
  <body>
    <main><h1>DM2Text</h1></main>
  </body>
</html>
```

Create `website/src/pages/privacy.astro`:

```astro
---
import '../styles/global.css';
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>DM2Text Privacy Policy</title>
  </head>
  <body>
    <main><h1>DM2Text Privacy Policy</h1></main>
  </body>
</html>
```

- [ ] **Step 7: Build and verify the scaffold**

Run from `website/`:

```powershell
pnpm check
pnpm build
pnpm test:output
```

Expected: Astro check succeeds, the build emits `dist/index.html` and
`dist/privacy/index.html`, and both Node tests pass.

- [ ] **Step 8: Commit the isolated scaffold**

```powershell
git add website
git commit -m "chore(website): scaffold static Astro site"
```

---

### Task 2: Add the shared document shell, branding, and CTA contract

**Files:**
- Copy: `docs/assets/dm2text-mark.svg` → `website/public/brand/dm2text-mark.svg`
- Copy: `public/icon-32.png` → `website/public/brand/icon-32.png`
- Copy: `public/icon-96.png` → `website/public/brand/icon-96.png`
- Copy: `public/icon-128.png` → `website/public/brand/icon-128.png`
- Create: `website/src/components/ChromeCta.astro`
- Create: `website/src/components/Header.astro`
- Create: `website/src/components/Footer.astro`
- Create: `website/src/layouts/BaseLayout.astro`
- Modify: `website/src/pages/index.astro`
- Modify: `website/src/pages/privacy.astro`
- Modify: `website/tests/site-output.test.mjs`

**Interfaces:**
- Consumes: URL constants from `website/src/config.ts`.
- Produces: `BaseLayout` props `{ title: string; description: string; canonicalPath: string }`; reusable `ChromeCta` prop `{ compact?: boolean }`; shared semantic header and footer.

- [ ] **Step 1: Extend the artifact test with metadata, links, and local-brand requirements**

Append to `website/tests/site-output.test.mjs`:

```js
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
```

- [ ] **Step 2: Build and confirm the new contract fails**

Run from `website/`:

```powershell
pnpm build
pnpm test:output
```

Expected: the new tests fail because canonical metadata, shared links, fallback
disclosure, and copied brand assets do not exist.

- [ ] **Step 3: Copy the existing brand assets without modification**

Create `website/public/brand/`, then copy the four source files byte-for-byte.
Verify equality from the repository root:

```powershell
$pairs = @(
  @('docs\assets\dm2text-mark.svg', 'website\public\brand\dm2text-mark.svg'),
  @('public\icon-32.png', 'website\public\brand\icon-32.png'),
  @('public\icon-96.png', 'website\public\brand\icon-96.png'),
  @('public\icon-128.png', 'website\public\brand\icon-128.png')
)
$pairs | ForEach-Object {
  $source = (Get-FileHash -LiteralPath $_[0] -Algorithm SHA256).Hash
  $copy = (Get-FileHash -LiteralPath $_[1] -Algorithm SHA256).Hash
  if ($source -ne $copy) { throw "Brand asset differs: $($_[1])" }
}
```

Expected: no output and exit code 0.

- [ ] **Step 4: Implement one CTA component for both fallback states**

Create `website/src/components/ChromeCta.astro`:

```astro
---
import { Download } from '@lucide/astro';

import {
  CHROME_WEB_STORE_URL,
  IS_MANUAL_INSTALL,
} from '../config';

interface Props {
  compact?: boolean;
}

const { compact = false } = Astro.props;
const disclosure = compact
  ? 'Manual install via GitHub'
  : 'Manual installation via GitHub until the Chrome Web Store listing is live.';
---

<div class:list={['flex flex-col', compact ? 'items-end gap-1' : 'items-start gap-2']}>
  <a
    class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-rose to-accent-violet px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(116,84,218,0.28)] transition-transform hover:-translate-y-0.5"
    href={CHROME_WEB_STORE_URL}
  >
    <Download aria-hidden="true" size={18} stroke-width={2} />
    Add to Chrome
  </a>
  {
    IS_MANUAL_INSTALL && (
      <span class:list={['text-muted', compact ? 'text-[0.68rem]' : 'text-xs']}>
        {disclosure}
      </span>
    )
  }
</div>
```

- [ ] **Step 5: Implement the shared header and footer**

Create `website/src/components/Header.astro`:

```astro
---
import { CodeXml } from '@lucide/astro';

import { GITHUB_URL } from '../config';
import ChromeCta from './ChromeCta.astro';
---

<header class="relative z-20 border-b border-line/70 bg-canvas/90">
  <nav
    aria-label="Primary navigation"
    class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8"
  >
    <a class="flex items-center gap-3 text-lg font-extrabold tracking-tight" href="/">
      <img src="/brand/dm2text-mark.svg" alt="" width="38" height="38" />
      <span>DM2Text</span>
    </a>
    <div class="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
      <a class="hover:text-ink" href="/#how-it-works">How it works</a>
      <a class="hover:text-ink" href="/privacy/">Privacy</a>
      <a class="inline-flex items-center gap-1.5 hover:text-ink" href={GITHUB_URL}>
        <CodeXml aria-hidden="true" size={16} /> GitHub
      </a>
    </div>
    <div class="flex items-center gap-3">
      <a class="text-sm font-semibold text-muted hover:text-ink md:hidden" href="/privacy/">
        Privacy
      </a>
      <ChromeCta compact />
    </div>
  </nav>
</header>
```

Create `website/src/components/Footer.astro`:

```astro
---
import { GITHUB_URL, ISSUES_URL } from '../config';
---

<footer class="border-t border-line bg-white/60">
  <div class="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-muted sm:px-8 lg:flex-row lg:items-center lg:justify-between">
    <a class="flex items-center gap-2 font-bold text-ink" href="/">
      <img src="/brand/dm2text-mark.svg" alt="" width="28" height="28" />
      DM2Text
    </a>
    <nav aria-label="Footer navigation" class="flex flex-wrap gap-x-5 gap-y-2">
      <a class="hover:text-ink" href={GITHUB_URL}>GitHub</a>
      <a class="hover:text-ink" href="/privacy/">Privacy</a>
      <a class="hover:text-ink" href={ISSUES_URL}>Report an issue</a>
    </nav>
    <p>Copyright © 2026 Piero A. Postigo Rocchetti.</p>
  </div>
</footer>
```

- [ ] **Step 6: Implement the metadata layout**

Create `website/src/layouts/BaseLayout.astro`:

```astro
---
import Footer from '../components/Footer.astro';
import Header from '../components/Header.astro';
import { SITE_URL } from '../config';
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
  canonicalPath: string;
}

const { title, description, canonicalPath } = Astro.props;
const canonicalUrl = new URL(canonicalPath, SITE_URL).toString();
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={description} />
    <meta name="theme-color" content="#faf9f6" />
    <link rel="canonical" href={canonicalUrl} />
    <link rel="icon" type="image/png" sizes="32x32" href="/brand/icon-32.png" />
    <link rel="icon" type="image/png" sizes="96x96" href="/brand/icon-96.png" />
    <link rel="apple-touch-icon" href="/brand/icon-128.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="DM2Text" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonicalUrl} />
    <title>{title}</title>
  </head>
  <body class="min-h-screen antialiased">
    <Header />
    <slot />
    <Footer />
  </body>
</html>
```

- [ ] **Step 7: Move both pages onto the shared layout**

Replace `website/src/pages/index.astro` with:

```astro
---
import { HOME_DESCRIPTION, HOME_TITLE } from '../config';
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title={HOME_TITLE} description={HOME_DESCRIPTION} canonicalPath="/">
  <main><h1 class="sr-only">DM2Text</h1></main>
</BaseLayout>
```

Replace `website/src/pages/privacy.astro` with:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout
  title="DM2Text Privacy Policy"
  description="Learn how DM2Text processes conversation content locally without analytics, tracking, or conversation uploads."
  canonicalPath="/privacy/"
>
  <main><h1 class="sr-only">DM2Text Privacy Policy</h1></main>
</BaseLayout>
```

- [ ] **Step 8: Build and verify the shared shell**

Run from `website/`:

```powershell
pnpm check
pnpm build
pnpm test:output
```

Expected: all diagnostics and four output tests pass. Inspect generated HTML and
confirm there are no external font or image URLs.

- [ ] **Step 9: Commit the shared shell**

```powershell
git add website
git commit -m "feat(website): add shared site shell"
```

---

### Task 3: Build the editorial hero and product workflow

**Files:**
- Create: `website/src/components/HeroMockup.astro`
- Create: `website/src/components/TranscriptExample.astro`
- Create: `website/src/components/HowItWorks.astro`
- Modify: `website/src/pages/index.astro`
- Modify: `website/tests/site-output.test.mjs`

**Interfaces:**
- Consumes: `ChromeCta`, `GITHUB_URL`, and the shared layout.
- Produces: the approved hero, static product figure, `#how-it-works` anchor, three-step workflow, and exact transcript-format example.

- [ ] **Step 1: Add landing-content assertions before implementation**

Append to `website/tests/site-output.test.mjs`:

```js
test('landing page explains the real copy workflow and output', async () => {
  const home = await readFile(pageUrl('index.html'), 'utf8');
  const text = visibleText(home);

  assert.match(text, /Local-first · Open source/);
  assert.match(text, /Copy Instagram chats into clean, structured text\./);
  assert.match(text, /Ends at the selected message/);
  assert.match(text, /Messages to include/);
  assert.match(home, />50</);
  assert.match(text, /Choose the endpoint/);
  assert.match(text, /Choose how many messages to include, ending at the selected message\./);
  assert.match(text, /Paste anywhere/);
  assert.match(text, /Person B: \[shared post by example\.account\]/);
  assert.match(text, /Caption: A visible post caption/);
});
```

- [ ] **Step 2: Build and confirm the landing-content test fails**

Run from `website/`:

```powershell
pnpm build
pnpm test:output
```

Expected: the new landing test fails on the missing eyebrow or headline.

- [ ] **Step 3: Implement the static product mockup**

Create `website/src/components/HeroMockup.astro` with a labelled `<figure>`.
Use only anonymized content and non-interactive elements:

```astro
<figure
  class="relative mx-auto w-full max-w-3xl"
  aria-label="Illustration of DM2Text copying fifty messages ending at a selected Instagram Direct message"
>
  <div class="overflow-hidden rounded-[1.5rem] border-[7px] border-[#272b39] bg-[#0b0f18] shadow-[0_30px_80px_rgba(48,36,111,0.32)]">
    <div class="flex h-8 items-center gap-1.5 border-b border-white/10 bg-[#171b27] px-4" aria-hidden="true">
      <span class="size-1.5 rounded-full bg-white/25"></span>
      <span class="size-1.5 rounded-full bg-white/25"></span>
      <span class="size-1.5 rounded-full bg-white/25"></span>
    </div>
    <div class="flex min-h-[23rem] flex-col">
      <div class="flex h-14 items-center justify-between border-b border-white/10 px-6 text-sm font-bold text-white">
        <span>Direct conversation</span><span aria-hidden="true">•••</span>
      </div>
      <div class="flex flex-1 flex-col justify-end gap-3 bg-[radial-gradient(circle_at_80%_10%,rgba(116,84,218,0.18),transparent_38%)] p-7 pb-10 sm:pr-40">
        <p class="text-center text-[0.68rem] text-white/45">Today, 10:41 AM</p>
        <p class="max-w-[78%] self-start rounded-2xl rounded-bl-sm bg-[#252a37] px-4 py-3 text-sm text-white">Did you see the draft?</p>
        <p class="max-w-[78%] self-end rounded-2xl rounded-br-sm bg-gradient-to-r from-[#4254e7] to-[#7c38df] px-4 py-3 text-sm text-white">Yes, sending notes now.</p>
        <p class="max-w-[78%] self-end rounded-2xl rounded-br-sm bg-gradient-to-r from-[#4254e7] to-[#7c38df] px-4 py-3 text-sm text-white">This is the final message.</p>
      </div>
    </div>
  </div>

  <div class="relative z-10 -mt-24 ml-auto w-[min(18rem,88%)] rounded-2xl border border-white/15 bg-[#1b1f29] p-5 text-white shadow-2xl sm:absolute sm:-right-5 sm:top-24 sm:mt-0 sm:w-56">
    <p class="text-sm font-bold">Copy context</p>
    <p class="mt-1 text-xs text-white/60">Ends at the selected message</p>
    <p class="mt-5 text-xs font-bold">Messages to include</p>
    <div class="mt-2 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm">50</div>
    <div class="mt-5 flex items-center justify-end gap-3 text-xs font-bold">
      <span>Cancel</span><span class="rounded-lg bg-[#1395ea] px-4 py-2">Copy</span>
    </div>
  </div>
</figure>
```

- [ ] **Step 4: Implement the transcript example and three steps**

Create `website/src/components/TranscriptExample.astro`:

```astro
<section class="grid items-center gap-8 rounded-[1.4rem] border border-line bg-gradient-to-br from-[#f2edff] to-white p-6 md:grid-cols-[0.75fr_1.25fr] md:p-8">
  <div>
    <h3 class="text-xl font-extrabold tracking-tight">Human-readable by default.</h3>
    <p class="mt-3 text-sm leading-7 text-muted">Sender, reply context, visible timestamps, and media labels remain clear when Instagram exposes them.</p>
  </div>
  <pre class="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-night p-5 text-xs leading-6 text-[#ececf4]"><code>[10:41 AM, Tuesday] Person A: Did you see the draft?
You (replying to Person A: Did you see the draft?): Yes, sending notes now.
Person B: [shared post by example.account]
  Caption: A visible post caption
Person A: [image]</code></pre>
</section>
```

Create `website/src/components/HowItWorks.astro`:

```astro
---
import TranscriptExample from './TranscriptExample.astro';

const steps = [
  {
    number: '01',
    title: 'Choose the endpoint',
    body: 'Open the menu on the final message you want and select Copy context.',
  },
  {
    number: '02',
    title: 'Pick the context',
    body: 'Choose how many messages to include, ending at the selected message.',
  },
  {
    number: '03',
    title: 'Paste anywhere',
    body: 'DM2Text puts a clean chronological transcript on your clipboard.',
  },
] as const;
---

<section id="how-it-works" class="scroll-mt-24 px-5 py-24 sm:px-8">
  <div class="mx-auto max-w-6xl">
    <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-accent-violet">How it works</p>
    <h2 class="mt-3 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">One action. Clean context.</h2>
    <div class="mt-10 grid gap-4 md:grid-cols-3">
      {steps.map((step) => (
        <article class="rounded-[1.25rem] border border-line bg-white p-7 shadow-[0_16px_45px_rgba(25,22,48,0.06)]">
          <p class="text-xs font-extrabold text-accent-violet">{step.number}</p>
          <h3 class="mt-10 text-xl font-extrabold tracking-tight">{step.title}</h3>
          <p class="mt-3 text-sm leading-7 text-muted">{step.body}</p>
        </article>
      ))}
    </div>
    <div class="mt-8"><TranscriptExample /></div>
  </div>
</section>
```

- [ ] **Step 5: Assemble the approved hero**

Replace `website/src/pages/index.astro` with:

```astro
---
import { CodeXml } from '@lucide/astro';

import ChromeCta from '../components/ChromeCta.astro';
import HeroMockup from '../components/HeroMockup.astro';
import HowItWorks from '../components/HowItWorks.astro';
import { GITHUB_URL, HOME_DESCRIPTION, HOME_TITLE } from '../config';
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title={HOME_TITLE} description={HOME_DESCRIPTION} canonicalPath="/">
  <main class="overflow-hidden">
    <section class="relative px-5 py-16 sm:px-8 sm:py-24">
      <div class="pointer-events-none absolute -right-32 top-0 -z-10 size-[42rem] rounded-full bg-[radial-gradient(circle,rgba(148,116,235,0.30),transparent_65%)] blur-2xl" aria-hidden="true"></div>
      <div class="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.82fr_1.18fr]">
        <div>
          <p class="inline-flex rounded-full border border-line bg-white/80 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#685d7c]">Local-first · Open source</p>
          <h1 class="mt-6 max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Copy Instagram chats into <span class="bg-gradient-to-r from-accent-rose to-accent-violet bg-clip-text text-transparent">clean, structured text.</span>
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-8 text-muted">DM2Text adds a native-looking Copy context action to Instagram Direct. Select an end message, choose how much context you need, and copy a chronological transcript — without sending your conversations anywhere.</p>
          <div class="mt-8 flex flex-wrap items-start gap-4">
            <ChromeCta />
            <a class="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-bold text-ink hover:border-accent-violet/50" href={GITHUB_URL}>
              <CodeXml aria-hidden="true" size={18} /> View source
            </a>
          </div>
          <div class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-muted" aria-label="Trust facts">
            <span>✓ Local-first</span><span>✓ No tracking</span><span>✓ No servers</span>
          </div>
        </div>
        <HeroMockup />
      </div>
    </section>
    <HowItWorks />
  </main>
</BaseLayout>
```

- [ ] **Step 6: Verify the hero and workflow**

Run from `website/`:

```powershell
pnpm format
pnpm check
pnpm build
pnpm test:output
```

Expected: formatting changes only website files; Astro check and all output
tests pass. Manually verify the mockup contains no real names, avatars, or
Instagram/Meta logos.

- [ ] **Step 7: Commit the product story**

```powershell
git add website
git commit -m "feat(website): build product landing story"
```

---

### Task 4: Complete the landing page with privacy and open-source proof

**Files:**
- Create: `website/src/components/PrivacyCallout.astro`
- Create: `website/src/components/OpenSource.astro`
- Modify: `website/src/pages/index.astro`
- Modify: `website/tests/site-output.test.mjs`

**Interfaces:**
- Consumes: `GITHUB_URL`, `ISSUES_URL`, and `ChromeCta` behavior already implemented.
- Produces: the dark privacy callout, four privacy facts, GPL section, issue link, and independence disclaimer.

- [ ] **Step 1: Add privacy and open-source assertions**

Append to `website/tests/site-output.test.mjs`:

```js
test('landing page states privacy and independence precisely', async () => {
  const home = await readFile(pageUrl('index.html'), 'utf8');

  assert.match(home, /Your DMs stay in your browser\./);
  assert.match(home, /Local processing/);
  assert.match(home, /No persistent storage/);
  assert.match(home, /No analytics/);
  assert.match(home, /No conversation uploads/);
  assert.match(home, /Built in the open\./);
  assert.match(home, /GPL-3\.0/);
  assert.match(
    home,
    /not affiliated with, endorsed by, or sponsored by Instagram or Meta/,
  );
  assert.match(home, /https:\/\/github\.com\/postigodev\/dm2text\/issues/);
});
```

- [ ] **Step 2: Build and confirm the new assertions fail**

Run from `website/`:

```powershell
pnpm build
pnpm test:output
```

Expected: the new test fails on the missing privacy heading.

- [ ] **Step 3: Implement the dark privacy callout**

Create `website/src/components/PrivacyCallout.astro`:

```astro
---
import { ChartNoAxesColumn, CloudOff, Database, ShieldCheck } from '@lucide/astro';

const facts = [
  { label: 'Local processing', Icon: ShieldCheck },
  { label: 'No persistent storage', Icon: Database },
  { label: 'No analytics', Icon: ChartNoAxesColumn },
  { label: 'No conversation uploads', Icon: CloudOff },
] as const;
---

<section class="px-5 py-8 sm:px-8">
  <div class="relative mx-auto grid max-w-7xl gap-12 overflow-hidden rounded-[1.5rem] bg-night px-7 py-16 text-white sm:px-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:px-16">
    <div class="pointer-events-none absolute -bottom-64 -right-32 size-[36rem] rounded-full bg-[radial-gradient(circle,rgba(116,84,218,0.65),transparent_65%)]" aria-hidden="true"></div>
    <div class="relative z-10">
      <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c2a5ff]">Privacy by design</p>
      <h2 class="mt-3 text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">Your DMs stay in your browser.</h2>
      <p class="mt-5 max-w-2xl text-base leading-8 text-white/70">DM2Text processes conversation content locally. It does not persist your messages, send them to the developer, or use analytics or tracking.</p>
    </div>
    <div class="relative z-10 grid gap-3 sm:grid-cols-2">
      {facts.map(({ label, Icon }) => (
        <div class="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm font-bold">
          <Icon aria-hidden="true" size={18} /> {label}
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 4: Implement the open-source section**

Create `website/src/components/OpenSource.astro`:

```astro
---
import { Bug, CodeXml } from '@lucide/astro';

import { GITHUB_URL, ISSUES_URL } from '../config';
---

<section class="px-5 py-24 sm:px-8">
  <div class="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
    <div class="max-w-2xl">
      <p class="text-xs font-extrabold uppercase tracking-[0.18em] text-accent-violet">Open source</p>
      <h2 class="mt-3 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Built in the open.</h2>
      <p class="mt-5 text-base leading-8 text-muted">DM2Text is open source and licensed under GPL-3.0.</p>
      <p class="mt-3 text-sm leading-7 text-muted">DM2Text is an independent project and is not affiliated with, endorsed by, or sponsored by Instagram or Meta.</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <a class="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white" href={GITHUB_URL}><CodeXml aria-hidden="true" size={18} /> View on GitHub</a>
      <a class="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-bold text-ink" href={ISSUES_URL}><Bug aria-hidden="true" size={18} /> Report an issue</a>
    </div>
  </div>
</section>
```

- [ ] **Step 5: Integrate both sections after `HowItWorks`**

In `website/src/pages/index.astro`, import both components:

```astro
import OpenSource from '../components/OpenSource.astro';
import PrivacyCallout from '../components/PrivacyCallout.astro';
```

Then render them after `<HowItWorks />` and before `</main>`:

```astro
<PrivacyCallout />
<OpenSource />
```

- [ ] **Step 6: Verify landing completion at responsive widths**

Run from `website/`:

```powershell
pnpm format
pnpm check
pnpm build
pnpm test:output
pnpm dev
```

Expected: automated checks pass. In the browser, inspect widths 1440px, 1024px,
768px, 390px, and 320px. Confirm no horizontal page scrolling, the mockup
remains legible, CTA disclosures are visible, focus order follows document
order, and privacy facts collapse without clipping. Stop the development server
after review.

- [ ] **Step 7: Commit the completed landing page**

```powershell
git add website
git commit -m "feat(website): add privacy and open source proof"
```

---

### Task 5: Publish the verbatim privacy policy

**Files:**
- Create: `website/src/content/privacy-policy.md`
- Modify: `website/src/pages/privacy.astro`
- Modify: `website/tests/site-output.test.mjs`

**Interfaces:**
- Consumes: the exact owner-approved policy delimited in the design specification.
- Produces: a readable `/privacy/` page with one `h1`, eleven section headings, and clickable GitHub links.

- [ ] **Step 1: Add privacy-output assertions before the policy exists**

Append to `website/tests/site-output.test.mjs`:

```js
test('privacy page renders the complete approved policy contract', async () => {
  const privacy = await readFile(pageUrl('privacy/index.html'), 'utf8');

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

  for (const text of requiredText) assert.match(privacy, new RegExp(text));

  assert.match(privacy, /href="https:\/\/github\.com\/postigodev\/dm2text\/issues"/);
  assert.match(privacy, /href="https:\/\/github\.com\/postigodev\/dm2text"/);
});
```

- [ ] **Step 2: Build and confirm the policy contract fails**

Run from `website/`:

```powershell
pnpm build
pnpm test:output
```

Expected: the privacy test fails on `Last updated: August 10, 2026`.

- [ ] **Step 3: Add the owner-approved policy as the only policy-content source**

Create `website/src/content/privacy-policy.md` with exactly:

````markdown
# DM2Text Privacy Policy

Last updated: August 10, 2026

DM2Text is a local-first browser extension that allows users to copy structured context from Instagram Direct conversations.

## Data handled

When a user explicitly starts a Copy context session, DM2Text may temporarily process information visible in the Instagram Direct interface, including:

- message text
- sender names or usernames
- visible timestamps
- reply context
- media labels
- shared-post information or captions when visible

## How the data is used

This information is used solely to generate the transcript requested by the user.

## Local processing

DM2Text processes conversation content locally in the user's browser.

DM2Text does not transmit conversation content to the developer or to external servers.

DM2Text does not initiate network requests for the purpose of collecting, storing, analyzing, or transmitting user conversation data.

## Storage and retention

Conversation data is not persistently stored by DM2Text.

The data exists temporarily in page memory while a copy session is active and is discarded after the operation completes.

The requested transcript is written to the user's operating-system clipboard. Clipboard contents may remain available to the operating system and other applications until they are replaced or cleared by the user.

## Data sharing

DM2Text does not sell, rent, share, or transfer user data to third parties.

## Analytics and tracking

DM2Text does not use analytics, advertising trackers, telemetry, or behavioral profiling.

## Authentication

DM2Text does not collect or access Instagram passwords, authentication credentials, or authentication tokens.

## Permissions

DM2Text requests access to Instagram pages only so it can identify and process the conversation content required for its Copy context feature.

The clipboardWrite permission is used solely to place the transcript requested by the user onto the clipboard.

## Limited Use

DM2Text's use of user data complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. User data is used only to provide DM2Text's disclosed single purpose.

## Changes

If DM2Text's data-handling practices change, this privacy policy will be updated before those changes are released.

## Contact

For privacy questions or issues:

<https://github.com/postigodev/dm2text/issues>

Source code:

<https://github.com/postigodev/dm2text>
```

- [ ] **Step 4: Render the Markdown through the shared layout**

Replace `website/src/pages/privacy.astro` with:

```astro
---
import PrivacyPolicy from '../content/privacy-policy.md';
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout
  title="DM2Text Privacy Policy"
  description="Learn how DM2Text processes conversation content locally without analytics, tracking, or conversation uploads."
  canonicalPath="/privacy/"
>
  <main class="px-5 py-16 sm:px-8 sm:py-24">
    <article class="prose prose-slate mx-auto max-w-3xl prose-headings:tracking-tight prose-headings:text-ink prose-h1:text-4xl prose-h1:font-black prose-h1:tracking-[-0.05em] prose-h2:mt-12 prose-h2:text-2xl prose-h2:font-extrabold prose-p:leading-8 prose-a:font-semibold prose-a:text-accent-violet prose-a:underline-offset-4 prose-li:marker:text-accent-violet sm:prose-h1:text-5xl">
      <PrivacyPolicy />
    </article>
  </main>
</BaseLayout>
```

- [ ] **Step 5: Verify exact source text and rendered policy**

First compare `website/src/content/privacy-policy.md` manually against the text
between the policy boundary comments in the approved design spec. Do not run a
formatter that rewords prose. Then run from `website/`:

```powershell
pnpm format
pnpm check
pnpm build
pnpm test:output
```

Expected: all tests pass; `/privacy/` contains one visible H1, every required
section, both clickable links, and no implementation-guidance text from the
design spec.

- [ ] **Step 6: Commit the privacy route**

```powershell
git add website
git commit -m "feat(website): publish privacy policy"
```

---

### Task 6: Enforce static output and document operation

**Files:**
- Create: `website/scripts/verify-static-output.mjs`
- Modify: `website/package.json`
- Create: `website/README.md`
- Modify: `website/tests/site-output.test.mjs`

**Interfaces:**
- Consumes: completed `website/dist/` artifact and all earlier commands.
- Produces: deterministic `pnpm verify`, website operator instructions, and Vercel deployment settings.

- [ ] **Step 1: Add the final no-hydration and route-count tests**

Update imports in `website/tests/site-output.test.mjs`:

```js
import { access, readdir, readFile } from 'node:fs/promises';
```

Add this helper and test:

```js
const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      return entry.isDirectory() ? walk(url) : [url];
    }),
  );
  return nested.flat();
};

test('artifact has no hydrated client bundle or unintended HTML route', async () => {
  const files = await walk(distUrl);
  const relativePaths = files.map((url) => decodeURIComponent(url.pathname.split('/dist/')[1]));
  const scripts = relativePaths.filter((path) => /\.(?:m?js)$/.test(path));
  const pages = relativePaths.filter((path) => path.endsWith('.html')).sort();

  assert.deepEqual(scripts, []);
  assert.deepEqual(pages, ['index.html', 'privacy/index.html']);

  for (const path of pages) {
    const html = await readFile(pageUrl(path), 'utf8');
    assert.doesNotMatch(html, /astro-island|client:(?:load|idle|visible|media|only)/);
  }
});
```

- [ ] **Step 2: Run the test against the current build**

Run from `website/`:

```powershell
pnpm build
pnpm test:output
```

Expected: all tests pass. If Astro emits a JavaScript file, inspect its source;
remove the hydration or script that caused it rather than weakening the test.

- [ ] **Step 3: Add an explicit artifact verification script**

Create `website/scripts/verify-static-output.mjs`:

```js
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
        const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
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

console.log(`Verified ${requiredFiles.length} required static files and zero client JavaScript bundles.`);
```

- [ ] **Step 4: Make the artifact script part of `pnpm verify`**

In `website/package.json`, add:

```json
"verify:static": "node scripts/verify-static-output.mjs"
```

Replace the existing `verify` value with:

```json
"verify": "pnpm format:check && pnpm check && pnpm build && pnpm test:output && pnpm verify:static"
```

- [ ] **Step 5: Write website-specific operator documentation**

Create `website/README.md`:

```markdown
# DM2Text website

Static Astro marketing website for [DM2Text](https://github.com/postigodev/dm2text).

## Local development

From `website/`:

```powershell
pnpm install
pnpm dev
```

Astro prints the local URL. The authored routes are `/` and `/privacy/`.

## Verification and build

```powershell
pnpm verify
```

This checks formatting and Astro/TypeScript diagnostics, creates the static build, tests the generated routes and content, and verifies that the artifact contains no client JavaScript bundles.

The production files are written to `website/dist/`.

## Chrome Web Store URL

`src/config.ts` exports `CHROME_WEB_STORE_URL`. It currently points to the latest GitHub release and causes every Add to Chrome CTA to display a manual-install disclosure.

When the Chrome Web Store listing is public, replace only `CHROME_WEB_STORE_URL` with the listing URL. `IS_MANUAL_INSTALL` updates automatically.

## Vercel

Configure the Vercel project with:

- Root Directory: `website`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: `dist`
- Domain: `dm2text.postigo.sh`

Astro uses static output and requires no adapter, serverless function, secret, analytics integration, or environment variable.
````

- [ ] **Step 6: Run the complete release-equivalent website gate**

Run from `website/`:

```powershell
pnpm install --frozen-lockfile
pnpm verify
```

Expected: the command exits 0. Prettier reports that all matched files use its
code style, Astro check reports zero errors, Astro reports a completed static
build, Node's test summary reports zero failures, and the final script prints
`Verified 6 required static files and zero client JavaScript bundles.`

- [ ] **Step 7: Perform final manual acceptance review**

Run `pnpm dev` from `website/` and verify:

- `/` and `/privacy/` render at 1440px, 1024px, 768px, 390px, and 320px;
- keyboard navigation reaches links in visual order and focus rings remain visible;
- reduced-motion mode removes decorative transitions;
- no content or product mockup causes horizontal page scrolling;
- the hero mockup uses only anonymized content and no Instagram/Meta branding;
- every **Add to Chrome** CTA displays manual GitHub disclosure;
- the policy matches `website/src/content/privacy-policy.md` and both links work;
- browser network inspection shows only local static assets and normal Vercel
  document delivery, with no analytics, tracker, font, or application API
  requests.

Stop the development server after review.

- [ ] **Step 8: Confirm extension and unrelated work remain untouched**

Run from the repository root:

```powershell
git status --short
git diff --name-only 94e855e..HEAD
```

Expected: implementation changes are under `website/` plus the approved website
spec and plan. The pre-existing untracked
`docs/superpowers/plans/2026-08-04-dm2text-mvp.md` remains untracked. No file in
`src/`, `entrypoints/`, `public/`, `wxt.config.ts`, root `package.json`, or root
`pnpm-lock.yaml` is modified by website implementation.

- [ ] **Step 9: Commit the verification and documentation**

```powershell
git add website
git commit -m "docs(website): document static deployment"
```

---

## Final checkpoint

Before pushing or deploying, run from the repository root:

```powershell
git status --short --branch
git log --oneline --decorate -8
Push-Location website
pnpm install --frozen-lockfile
pnpm verify
Pop-Location
```

Expected: `pnpm verify` passes, `website/dist/` is ignored, all implementation
commits use Conventional Commit messages, and the only unrelated untracked file
is the preserved historical MVP plan. Publishing commits, creating a pull
request, configuring Vercel, or changing DNS requires separate user
authorization.
