# Chrome CTA Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic download glyph in every website "Add to Chrome" CTA with the current multicolor Google Chrome icon.

**Architecture:** Store the unmodified 2022 Chrome icon as a local static SVG and render it through the existing shared `ChromeCta.astro` component. Extend the static-output test so both CTA instances must reference the asset and the old Lucide download icon cannot survive the build.

**Tech Stack:** Astro 7, Vanilla TypeScript, Tailwind CSS 4, Node test runner, pnpm

## Global Constraints

- Keep the CTA text, gradient, dimensions, spacing, hover behavior, destination, and manual-install disclosure unchanged.
- Make no runtime network request and add no dependency.
- Render the local Chrome mark at 18 by 18 pixels and treat it as decorative.
- Preserve the static site and zero-client-JavaScript constraints.

---

### Task 1: Replace the CTA glyph and lock every instance with an output test

**Files:**
- Create: `website/public/brand/google-chrome.svg`
- Modify: `website/src/components/ChromeCta.astro`
- Test: `website/tests/site-output.test.mjs`

**Interfaces:**
- Consumes: the existing `ChromeCta` props `{ compact?: boolean }` and Astro public-asset URL `/brand/google-chrome.svg`.
- Produces: every `ChromeCta` instance renders one decorative 18 by 18 local Chrome logo and no `lucide-download` SVG.

- [ ] **Step 1: Write the failing static-output assertion**

Append to the existing landing-page output test:

```js
const chromeCtas = homepage.match(/>Add to Chrome<\/a>/g) ?? [];
const chromeLogos = homepage.match(
  /<img src="\/brand\/google-chrome\.svg" alt="" width="18" height="18">/g,
) ?? [];

assert.equal(chromeCtas.length, 2);
assert.equal(chromeLogos.length, chromeCtas.length);
assert.doesNotMatch(homepage, /lucide-download/);
```

- [ ] **Step 2: Run the output test to verify it fails**

Run:

```powershell
pnpm build
pnpm test:output
```

Expected: FAIL because the built page contains two `lucide-download` SVGs and no `/brand/google-chrome.svg` image.

- [ ] **Step 3: Add the local Chrome SVG**

Create `website/public/brand/google-chrome.svg` with the current 2022 Chrome mark, copied unchanged from Wikimedia Commons' `Google Chrome icon (February 2022).svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="48" width="48"><defs><linearGradient id="a" x1="3.2173" y1="15" x2="44.7812" y2="15" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d93025"/><stop offset="1" stop-color="#ea4335"/></linearGradient><linearGradient id="b" x1="20.7219" y1="47.6791" x2="41.5039" y2="11.6837" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fcc934"/><stop offset="1" stop-color="#fbbc04"/></linearGradient><linearGradient id="c" x1="26.5981" y1="46.5015" x2="5.8161" y2="10.506" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1e8e3e"/><stop offset="1" stop-color="#34a853"/></linearGradient></defs><circle cx="24" cy="23.9947" r="12" fill="#fff"/><path d="M3.2154,36A24,24,0,1,0,12,3.2154,24,24,0,0,0,3.2154,36ZM34.3923,18A12,12,0,1,1,18,13.6077,12,12,0,0,1,34.3923,18Z" fill="none"/><path d="M24,12H44.7812a23.9939,23.9939,0,0,0-41.5639.0029L13.6079,30l.0093-.0024A11.9852,11.9852,0,0,1,24,12Z" fill="url(#a)"/><circle cx="24" cy="24" r="9.5" fill="#1a73e8"/><path d="M34.3913,30.0029,24.0007,48A23.994,23.994,0,0,0,44.78,12.0031H23.9989l-.0025.0093A11.985,11.985,0,0,1,34.3913,30.0029Z" fill="url(#b)"/><path d="M13.6086,30.0031,3.218,12.006A23.994,23.994,0,0,0,24.0025,48L34.3931,30.0029l-.0067-.0068a11.9852,11.9852,0,0,1-20.7778.007Z" fill="url(#c)"/></svg>
```

- [ ] **Step 4: Replace the shared Lucide icon**

Remove the `Download` import and replace its component usage in `ChromeCta.astro`:

```astro
<img
  src="/brand/google-chrome.svg"
  alt=""
  width="18"
  height="18"
  aria-hidden="true"
/>
```

- [ ] **Step 5: Run the complete website verification**

Run:

```powershell
pnpm verify
```

Expected: formatting passes; Astro reports zero diagnostics; two static pages build; all output tests pass; the static verifier reports zero client JavaScript bundles.

- [ ] **Step 6: Commit the implementation**

```powershell
git add -- website/public/brand/google-chrome.svg website/src/components/ChromeCta.astro website/tests/site-output.test.mjs
git commit -m "style(website): use Chrome logo in install CTA"
```
