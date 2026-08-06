# DM2Text Repository Polish Design

**Date:** 2026-08-05
**Status:** Approved for implementation planning
**Scope:** Public repository presentation, licensing, contributor experience, CI, and tag-driven releases

## Objective

Turn the existing public DM2Text repository into a credible, visually coherent, contributor-friendly open-source project without changing extension behavior or adding ongoing process that the project does not yet need.

The result must make three things immediately clear:

1. DM2Text is a real, installable browser extension with a focused purpose.
2. Conversation data stays local except for the user-requested clipboard write.
3. External contributions are welcome and governed by explicit legal, privacy, testing, and release rules.

## Current State

- The validated MVP is published as `v0.1.0`.
- The public repository currently uses `feat/dm2text-mvp` as its default branch because it was the first branch pushed to the empty repository.
- The README documents installation, use, privacy, development, and limitations.
- There is no license, original project mark, screenshot, CI workflow, community health documentation, repository topics, or automated release workflow.
- Issues, Wiki, and Projects are enabled. Wiki and Projects are unused.
- The tracked source contains no runtime dependencies and must keep its current lightweight budgets.

## Non-Goals

- No production extension behavior changes.
- No frontend framework, runtime dependency, analytics, telemetry, or network request.
- No website, browser-store submission, funding configuration, roadmap, CLA, Discussions, Dependabot, or automated version-bump bot.
- No branch-protection policy in this iteration.
- No real conversation content, usernames, avatars, conversation IDs, or unredacted DOM captures in repository assets or issue templates.

## Legal Design

### License

DM2Text will use **GNU General Public License v3.0 only**, identified everywhere as `GPL-3.0-only`.

- Add a root `LICENSE` containing the unmodified official GPL version 3 text.
- Do not append project-specific prose to the license text.
- State `Copyright © 2026 Piero A. Postigo Rocchetti` next to the license reference in the README.
- Add `license: "GPL-3.0-only"`, `author`, `repository`, `bugs`, `homepage`, and relevant keywords to `package.json` while keeping the package private.
- State in `CONTRIBUTING.md` that submitted contributions are licensed under GPL-3.0-only. Do not require a CLA.
- Do not add repetitive license headers to every TypeScript file in this pass.

### Independence from Instagram and Meta

The README will state that DM2Text is an independent project and is not affiliated with, endorsed by, or sponsored by Instagram or Meta.

The original mark must not use Instagram's camera glyph, wordmark, or exact gradient. Product screenshots may show the minimum Instagram interface necessary to explain integration, but must be tightly cropped and contain no conversation data.

## Visual Identity

### Context Ribbon mark

The approved identity is **Context Ribbon**:

- A rounded-square container with a warm coral-to-magenta-to-violet accent.
- An original white conversation/document ribbon with two text lines.
- No camera outline or other Instagram trademark element.
- The name remains `DM2Text` without a separate wordmark font dependency.

Assets:

- Keep one editable SVG source under `docs/assets/`.
- Export PNG extension icons at the Chromium manifest sizes required by WXT.
- Use the same mark in the README header and the packaged extension manifest.
- Verify every small raster size remains recognizable rather than relying on a single scaled bitmap.

### README presentation

The README header will use a compact, centered hierarchy:

1. Context Ribbon mark.
2. `DM2Text` title.
3. One-sentence privacy-focused value proposition.
4. Four functional badges only: latest release, CI, GPL-3.0-only, and Chrome Manifest V3.

Below the hero, keep the current information architecture but add one authentic product demonstration before the long-form sections.

The approved demonstration uses the two user-supplied product captures as approval references:

- the native message action menu containing `Copy context`;
- the DM2Text count-entry dialog.

Those temporary inputs are not implementation dependencies and must not be committed. Reproduce the approved view from the current extension runtime by opening a locally selected conversation with Instagram set to English, mounting the real menu action and dialog, and capturing only the isolated UI. If a safe live capture cannot exclude all surrounding content, render a documentation-only composite from the extension's actual CSS, icons, and English strings instead of editing or committing a private screenshot.

The published composite must:

- recapture or redraw all visible native menu labels in English;
- preserve the proportions, spacing, colors, icon alignment, and dialog appearance of the real extension;
- crop away page background and any potentially identifying content;
- contain no messages, usernames, avatars, timestamps tied to a conversation, or thread IDs;
- include useful alt text in the README;
- be optimized so repository presentation does not materially inflate the extension package.

Documentation imagery belongs under `docs/assets/` and must not be copied into the packaged extension unless it is also a required extension icon.

## Community Design

All public documentation and templates will be written in English.

### `CONTRIBUTING.md`

Keep the guide practical and short:

- project scope and architectural boundaries;
- Node/pnpm setup and WXT development flow;
- commands for tests, typecheck, build, and ZIP;
- requirement to use conventional commits in `type(scope): description` form;
- requirement for deterministic tests and anonymized Instagram HTML fixtures;
- prohibition on committing real conversation content, private thread IDs, credentials, generated build output, or `.superpowers/` artifacts;
- pull request expectations and GPL-3.0-only contribution terms.

### `CODE_OF_CONDUCT.md`

Adopt Contributor Covenant 2.1 with its attribution intact. Use `ppostigorocchetti@gmail.com` as the private enforcement contact and avoid placeholders.

### `SECURITY.md`

- Treat only the latest release as supported during the MVP phase.
- Direct vulnerability reports to GitHub Private Vulnerability Reporting.
- Tell reporters not to open public issues for vulnerabilities and never to include real DMs, session material, credentials, or private thread identifiers.
- Set a modest response expectation without guaranteeing a resolution date.

### Issue and pull request templates

Add GitHub issue forms for:

- **Bug report:** extension version, browser/version, group or individual conversation, expected/actual behavior, reproducible steps, and confirmation that all evidence is anonymized.
- **Feature request:** problem, proposed outcome, alternatives, and privacy/performance impact.

Disable blank issues and link security reports to the repository's private advisory form. Every bug-report surface must prominently prohibit raw DMs and unredacted DOM dumps.

Add a pull request template covering:

- focused scope;
- linked issue where applicable;
- tests and manual verification;
- privacy and network behavior;
- bundle-budget impact;
- anonymization of fixtures and screenshots;
- documentation and release-note impact.

Do not add CODEOWNERS, a CLA, or further governance files in this iteration.

## Repository Configuration

Rename the current default branch from `feat/dm2text-mvp` to `main` locally and on GitHub, preserving history and the existing `v0.1.0` tag. Update the local upstream and verify the old remote branch no longer remains as the default or an unnecessary duplicate.

Repository settings:

- keep Issues enabled;
- disable unused Wiki and Projects;
- enable GitHub Private Vulnerability Reporting;
- keep the existing public visibility and description;
- leave homepage unset until a real project site exists;
- add focused topics: `browser-extension`, `chrome-extension`, `instagram-direct`, `local-first`, `privacy`, `typescript`, `wxt`, and `manifest-v3`.

## Continuous Integration

Add a least-privilege CI workflow for pushes and pull requests targeting `main`.

The workflow will:

1. Check out the exact commit.
2. Install the repository's declared pnpm version using the official pnpm setup action.
3. Configure a supported Node version consistently with local validation.
4. Run `pnpm install --frozen-lockfile`.
5. Run `pnpm test`.
6. Run `pnpm typecheck`.
7. Run `pnpm build`.
8. Run a dependency-free JavaScript budget check over the production output.
9. Run `pnpm zip`.
10. Run the packaged-extension budget check over the newly created ZIP.

Standardize the toolchain in the repository before adding the workflows:

- Node `24.12.0`, matching the validated local environment, recorded in `.node-version` and used by the workflows;
- pnpm `10.26.2`, recorded in `package.json` through the `packageManager` field and used by the official pnpm setup action.

The budget check will enforce the existing project limits using explicit byte thresholds:

- total production JavaScript below 60,000 bytes;
- packaged extension below 200,000 bytes when a ZIP exists.

The check must identify which threshold failed and report measured bytes. JavaScript measurement must run after `pnpm build`; ZIP measurement must run after `pnpm zip` and must fail if the expected archive is missing. Its logic belongs in one small repository script reusable by local validation and the release workflow. CI gets `contents: read` only and uses concurrency keyed by workflow and ref so a superseded run can be cancelled safely.

## Tag-Driven Releases

Add a separate release workflow triggered only by pushed tags matching `v*`.

The workflow will:

1. Check out the tagged commit.
2. Read `package.json` and require the tag to equal `v${package.version}` exactly.
3. Install with the frozen pnpm lockfile.
4. Run tests, typecheck, the production build, and the JavaScript budget check.
5. Run `pnpm zip` and locate the versioned Chrome ZIP deterministically.
6. Run the packaged-extension budget check against that ZIP.
7. Create a GitHub Release titled `DM2Text <tag>` with generated release notes.
8. Upload the ZIP with a human-readable asset label.

Only the release job receives `contents: write`. No package, issue, pull-request, or identity-token permissions are granted.

The publication step must be safe to rerun without silently replacing an intentional asset:

- if no release exists, create it and upload the expected ZIP;
- if the release exists but the expected asset is missing, upload it;
- if both release and asset exist, compare the published asset digest with the newly built ZIP;
- succeed without uploading when the digests match;
- fail with a manual-resolution message when the digests differ.

A version mismatch, validation failure, missing ZIP, budget violation, release target mismatch, or asset digest conflict must stop publication and produce a clear workflow error.

Creating and pushing the version tag remains an explicit maintainer action. Release Please and other automatic version-bump systems are out of scope.

## README Content Changes

Preserve the existing install, use, transcript example, privacy, local development, architecture, and limitations content. Improve presentation without turning the README into a marketing page.

Add or revise:

- branded hero and badges;
- authentic anonymized product demonstration;
- direct latest-release download path;
- compact links to contribution, security, code of conduct, and license documents;
- independent-project disclaimer;
- copyright and GPL-3.0-only statement.

Do not add a changelog section, long roadmap, contributor wall, donation buttons, or speculative browser support claims.

## Validation

Implementation is complete only when all of the following hold:

- `pnpm install --frozen-lockfile` succeeds.
- All existing tests pass with no production behavior changes.
- Typecheck, production build, ZIP, and budget checks pass.
- The manifest contains the intended icons and the extension still loads unpacked.
- Markdown links and GitHub template links resolve.
- No private conversation material or repository-external local paths appear in tracked files.
- The README imagery is legible in GitHub light and dark themes and has alt text.
- CI passes on `main` and on a pull request.
- Workflow syntax, permissions, version/tag validation, local packaging, digest comparison logic, and both budget checks are validated without publishing a disposable release. The first full GitHub publication exercise occurs with the next intentional project version; implementing repository polish does not authorize a fake public tag or a replacement of `v0.1.0`.
- GitHub reports `main` as default, the requested topics are present, Wiki and Projects are disabled, and private vulnerability reporting is enabled.

## Rollout and Recovery

Commit repository files in coherent conventional commits, then rename/publish `main` and update GitHub settings. Workflow changes must land before using the next real version tag.

Do not rewrite or recreate `v0.1.0`. On a future automated release, reruns follow the digest rules above and never replace a differing existing asset automatically. Git branch renaming must be verified both locally and remotely before deleting the old branch reference.

The existing untracked `.superpowers/` directory and the unrelated untracked MVP plan remain outside implementation commits unless separately approved.
