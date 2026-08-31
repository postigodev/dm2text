# Reference Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution to implement this plan task-by-task.

**Goal:** Replicate the supplied home and privacy HTML references in the Astro webapp using only local assets.

**Architecture:** Keep `BaseLayout` responsible for metadata and shared shell, and replace the shared header/footer plus route markup and CSS with the reference presentation. Add one anonymized local screenshot for the home demo.

**Tech Stack:** Astro, Tailwind CSS, plain static HTML/CSS, Node test runner.

## Global Constraints

- No new dependencies or hydrated client bundle.
- Preserve existing canonical URLs, policy facts, and configured external URLs.
- Use only existing brand assets plus the user-supplied anonymized screenshot.

### Task 1: Anonymized marketing asset

**Files:** Create `website/public/marketing/dm-example.png`.

- [ ] Edit only the visible username and message text; preserve the Instagram UI and framing.
- [ ] Inspect the result for readable fictitious copy and absence of the original identity.

### Task 2: Reference shell and routes

**Files:** Modify `website/src/components/Header.astro`, `Footer.astro`, `ChromeCta.astro`, `website/src/pages/index.astro`, `privacy.astro`, `website/src/layouts/BaseLayout.astro`, and `website/src/styles/global.css`.

- [ ] Port the reference semantic structure and responsive CSS.
- [ ] Use config constants for GitHub, issues, and install URLs.
- [ ] Render the local screenshot and reference transcript on home.
- [ ] Render the approved policy in the reference document layout.

### Task 3: Static verification

**Files:** Modify `website/tests/site-output.test.mjs`.

- [ ] Assert the new home demo, privacy headings, local asset, shared navigation, and no hydration.
- [ ] Run `pnpm build` in `website` and expect success.
- [ ] Run `pnpm test` in `website` and expect all tests to pass.
