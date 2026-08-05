# DM2Text UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the copy-session dialog and toast so they feel native to Instagram Direct, adapt automatically to light and dark themes, and communicate collection progress through the approved line-of-context treatment.

**Architecture:** Keep the existing lazy Shadow DOM components and their public contracts unchanged. Add semantic, state-specific markup and component-local design tokens inside `copy-dialog.ts` and `toast.ts`; exercise those stable DOM hooks in jsdom rather than testing pixels or Instagram-owned styles.

**Tech Stack:** WXT 0.21, Manifest V3, strict vanilla TypeScript, native DOM APIs, Shadow DOM, plain CSS, Vitest with jsdom, pnpm.

## Global Constraints

- Modify only `src/ui/copy-dialog.ts`, `src/ui/copy-dialog.test.ts`, `src/ui/toast.ts`, and the new `src/ui/toast.test.ts`.
- Preserve `CopySessionDialog`, `createCopySessionDialog()`, `ToastKind`, and `showToast()` signatures exactly.
- Do not change collection, parsing, anchor selection, formatting, clipboard, navigation, privacy, persistence, or session lifecycle behavior.
- Add no dependencies, assets, fonts, runtime messages, storage, network requests, polling, or permanent DOM.
- Keep the dialog and toast lazy and remove every owned node during existing cleanup.
- Use a light default and `@media (prefers-color-scheme: dark)`; do not inspect Instagram state or store a theme preference.
- Use only brief opacity/translate entry motion and disable it under `prefers-reduced-motion: reduce`.
- Preserve initial input focus, Escape cancellation, inline validation, status/alert semantics, and keyboard-operable native controls.
- Run commands with pnpm.
- Use conventional commits in `type(scope): description` form.
- Keep total JavaScript below 60,000 bytes and the packaged extension below 200,000 bytes.
- Never add `.superpowers/` visual-companion output or `docs/superpowers/plans/2026-08-04-dm2text-mvp.md` to a commit.

## File Map

- `src/ui/copy-dialog.ts`: owns the dialog host, scrim, state markup, line-of-context progress, and all dialog styles.
- `src/ui/copy-dialog.test.ts`: verifies lifecycle plus semantic hooks for count, progress, partial, validation, accessibility, and cleanup.
- `src/ui/toast.ts`: owns toast structure, semantic indicator, automatic theme tokens, motion, and timed/click removal.
- `src/ui/toast.test.ts`: verifies toast roles, kinds, content structure, click removal, and four-second cleanup.

---

### Task 1: Polish the persistent copy-session dialog

**Files:**
- Modify: `src/ui/copy-dialog.test.ts`
- Modify: `src/ui/copy-dialog.ts`

**Interfaces:**
- Consumes: the existing `CopySessionDialog` contract and the orchestrator calls `requestCount()`, `updateProgress(collected, requested)`, `confirmPartial(available, requested, reason)`, and `close()`.
- Produces: the same `createCopySessionDialog(): CopySessionDialog` behavior plus stable owned hooks `data-dm2text-scrim`, `data-dm2text-state`, `data-dm2text-progress`, `data-dm2text-error`, and `data-variant`.

- [ ] **Step 1: Add failing semantic-state tests**

Extend `src/ui/copy-dialog.test.ts` with these tests while preserving every existing lifecycle assertion:

```ts
it('renders a labelled count state inside the owned scrim', () => {
  const dialog = createCopySessionDialog();
  void dialog.requestCount();

  expect(shadowRoot().querySelector('[data-dm2text-scrim]')).not.toBeNull();
  expect(shadowRoot().querySelector('[data-dm2text-state="count"]')).not.toBeNull();
  expect(shadowRoot().querySelector('h2')?.textContent).toBe('Copy context');
  expect(shadowText()).toContain('Ends at the selected message');
  expect(shadowRoot().querySelector('label')?.textContent).toContain(
    'Messages to include',
  );
  expect(shadowRoot().activeElement).toBe(
    shadowRoot().querySelector<HTMLInputElement>('input'),
  );
  expect(
    shadowRoot().querySelector('[data-variant="primary"]')?.textContent,
  ).toBe('Copy');

  dialog.close();
});

it('exposes clamped determinate progress without changing the reported count', () => {
  const dialog = createCopySessionDialog();

  dialog.updateProgress(75, 50);

  const progress = shadowRoot().querySelector<HTMLProgressElement>(
    '[data-dm2text-progress]',
  );
  expect(progress?.max).toBe(50);
  expect(progress?.value).toBe(50);
  expect(progress?.getAttribute('aria-label')).toBe(
    'Collected 75 of 50 messages',
  );
  expect(shadowRoot().querySelector('[data-dm2text-state="progress"]')).not
    .toBeNull();
  expect(shadowText()).toContain('75 of 50 messages');

  dialog.close();
});

it('keeps achieved progress visible during partial confirmation', async () => {
  const dialog = createCopySessionDialog();
  const confirmation = dialog.confirmPartial(23, 50, 'stalled');

  const progress = shadowRoot().querySelector<HTMLProgressElement>(
    '[data-dm2text-progress]',
  );
  expect(shadowRoot().querySelector('[data-dm2text-state="partial"]')).not
    .toBeNull();
  expect(progress?.value).toBe(23);
  expect(progress?.max).toBe(50);
  expect(
    shadowRoot().querySelector('[data-variant="primary"]')?.textContent,
  ).toBe('Copy 23');

  clickButton('Cancel');
  await expect(confirmation).resolves.toBe(false);
  dialog.close();
});

it('keeps validation polite and structurally stable', async () => {
  const dialog = createCopySessionDialog();
  const countPromise = dialog.requestCount();

  setCountValue('0');
  clickButton('Copy');

  const error = shadowRoot().querySelector('[data-dm2text-error]');
  expect(error?.getAttribute('aria-live')).toBe('polite');
  expect(error?.textContent).toBe('Enter a whole number from 1 to 999.');
  expect(shadowRoot().querySelector('[data-dm2text-state="count"]')).not
    .toBeNull();

  clickButton('Cancel');
  await expect(countPromise).resolves.toBeNull();
  dialog.close();
});
```

Adjust the existing progress assertion from `Collecting 12 of 50…` to
`12 of 50 messages` so it tests the approved copy.

- [ ] **Step 2: Run the dialog tests and verify the new contract fails**

Run:

```powershell
pnpm test -- src/ui/copy-dialog.test.ts
```

Expected: FAIL because the scrim, state hooks, progress element, variants, and
new supporting copy do not exist yet. Existing cancellation and cleanup tests
must remain present.

- [ ] **Step 3: Add the persistent scrim and state render helpers**

In `createCopySessionDialog()`, replace the direct `shadow.append(style,
panel)` mounting with:

```ts
const scrim = document.createElement('div');
scrim.setAttribute('data-dm2text-scrim', '');
const panel = document.createElement('section');
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-modal', 'true');
panel.setAttribute('aria-labelledby', 'dm2text-dialog-title');
scrim.append(panel);
shadow.append(style, scrim);
```

Replace `heading()` and direct `panel.replaceChildren(...)` calls with these
helpers:

```ts
type DialogState = 'count' | 'progress' | 'partial';

function renderState(
  panel: HTMLElement,
  state: DialogState,
  ...content: Node[]
): void {
  panel.setAttribute('data-dm2text-state', state);
  panel.replaceChildren(dialogHeader(), ...content);
}

function dialogHeader(): HTMLElement {
  const header = document.createElement('header');
  const copy = document.createElement('div');
  const title = document.createElement('h2');
  title.id = 'dm2text-dialog-title';
  title.textContent = 'Copy context';
  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.textContent = 'Ends at the selected message';
  const anchor = document.createElement('span');
  anchor.className = 'anchor-glyph';
  anchor.setAttribute('aria-hidden', 'true');
  anchor.textContent = '⌁';
  copy.append(title, subtitle);
  header.append(copy, anchor);
  return header;
}

function contextProgress(
  current: number,
  requested: number,
  decorative = false,
): HTMLElement {
  const safeMaximum = Math.max(1, requested);
  const clamped = Math.min(Math.max(0, current), safeMaximum);
  const wrapper = document.createElement('div');
  wrapper.className = 'context-progress';
  const history = document.createElement('span');
  history.className = 'context-endpoint history-endpoint';
  history.setAttribute('aria-hidden', 'true');
  const progress = document.createElement('progress');
  progress.setAttribute('data-dm2text-progress', '');
  if (decorative) {
    progress.setAttribute('aria-hidden', 'true');
  } else {
    progress.setAttribute(
      'aria-label',
      `Collected ${current} of ${requested} messages`,
    );
  }
  progress.max = safeMaximum;
  progress.value = clamped;
  const anchor = document.createElement('span');
  anchor.className = 'context-endpoint anchor-endpoint';
  anchor.setAttribute('aria-hidden', 'true');
  wrapper.append(history, progress, anchor);
  return wrapper;
}

function progressCopy(current: number, requested: number): HTMLElement {
  const status = document.createElement('p');
  status.className = 'progress-copy';
  status.setAttribute('role', 'status');
  status.textContent = `${current} of ${requested} messages`;
  return status;
}
```

Do not attach click behavior to the scrim; only Cancel and Escape abort the
session, preserving the established explicit lifecycle.

- [ ] **Step 4: Render count, progress, and partial states through the helpers**

Update `renderCountForm()` to use the approved label and variants:

```ts
label.textContent = 'Messages to include';
// Keep input min, max, step, required, validation, and input.focus() unchanged.
const actions = actionRow(
  cancelButton(cancel),
  button('Copy', 'submit', 'primary'),
);
renderState(panel, 'count', contextProgress(0, 1, true), form);
```

Update `renderProgress()` to:

```ts
renderState(
  panel,
  'progress',
  contextProgress(collected, requested),
  progressCopy(collected, requested),
  actionRow(cancelButton(cancel)),
);
```

Update `renderPartialConfirmation()` to:

```ts
const message = document.createElement('p');
message.className = 'partial-copy';
message.textContent =
  `Found only ${available} of ${requested} messages. ` +
  'Copy the available messages?';
const copyAvailable = button(`Copy ${available}`, 'button', 'primary');
copyAvailable.addEventListener('click', () => finish(true));
renderState(
  panel,
  'partial',
  contextProgress(available, requested),
  message,
  actionRow(cancelButton(cancel), copyAvailable),
);
```

Replace the button helper with the exact variant contract:

```ts
function button(
  text: string,
  type: 'button' | 'submit',
  variant: 'primary' | 'secondary' = 'secondary',
): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = type;
  element.setAttribute('data-variant', variant);
  element.textContent = text;
  return element;
}
```

- [ ] **Step 5: Replace the dialog styles with the approved token system**

Replace `DIALOG_STYLES` completely. The replacement must define:

```css
:host {
  --dm-scrim: rgb(0 0 0 / 18%);
  --dm-panel: #ffffff;
  --dm-control: #f2f3f5;
  --dm-text: #101114;
  --dm-text-secondary: #5f636d;
  --dm-text-muted: #858a94;
  --dm-border: rgb(16 17 20 / 12%);
  --dm-border-emphasis: rgb(16 17 20 / 22%);
  --dm-action: #0095f6;
  --dm-action-active: #1877f2;
  --dm-error: #c6283c;
  color: var(--dm-text);
  font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

@media (prefers-color-scheme: dark) {
  :host {
    --dm-scrim: rgb(0 0 0 / 42%);
    --dm-panel: #191b20;
    --dm-control: #101217;
    --dm-text: #f5f5f7;
    --dm-text-secondary: #c7c9cf;
    --dm-text-muted: #989ca6;
    --dm-border: rgb(255 255 255 / 11%);
    --dm-border-emphasis: rgb(255 255 255 / 20%);
    --dm-error: #ff7b8b;
  }
}

*, *::before, *::after { box-sizing: border-box; }

[data-dm2text-scrim] {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--dm-scrim);
}

section {
  width: min(360px, 100%);
  padding: 20px;
  border: 1px solid var(--dm-border);
  border-radius: 16px;
  color: var(--dm-text);
  background: var(--dm-panel);
  box-shadow: 0 18px 48px rgb(0 0 0 / 28%);
  animation: dm-panel-in 140ms cubic-bezier(.2,.8,.2,1);
}

header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
h2 { margin: 0; font-size: 16px; font-weight: 650; letter-spacing: -.01em; }
p { margin: 0; }
.subtitle { margin-top: 2px; color: var(--dm-text-muted); font-size: 12px; }
.anchor-glyph {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--dm-border);
  border-radius: 50%;
  color: var(--dm-text-muted);
}
.context-progress { display: flex; align-items: center; gap: 5px; margin: 18px 0 16px; }
.context-endpoint { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; background: var(--dm-border-emphasis); }
.anchor-endpoint { background: var(--dm-action); }
progress { width: 100%; height: 2px; overflow: hidden; border: 0; border-radius: 999px; background: var(--dm-border); }
progress::-webkit-progress-bar { background: var(--dm-border); }
progress::-webkit-progress-value { background: var(--dm-action); }
progress::-moz-progress-bar { background: var(--dm-action); }
form, label { display: grid; }
label { gap: 7px; color: var(--dm-text-secondary); font-size: 12px; font-weight: 600; }
input, button { font: inherit; }
input {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border: 1px solid var(--dm-border);
  border-radius: 9px;
  outline: 0;
  color: var(--dm-text);
  background: var(--dm-control);
  font-variant-numeric: tabular-nums;
}
input:hover { border-color: var(--dm-border-emphasis); }
input:focus-visible { border-color: var(--dm-action); box-shadow: 0 0 0 3px rgb(0 149 246 / 20%); }
[data-dm2text-error] { min-height: 18px; margin-top: 5px; color: var(--dm-error); font-size: 12px; font-weight: 500; }
.progress-copy, .partial-copy { color: var(--dm-text-secondary); }
.actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 18px; }
button {
  min-height: 36px;
  padding: 8px 13px;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  color: var(--dm-text-secondary);
  background: transparent;
  font-weight: 650;
}
button:hover { background: var(--dm-control); }
button:active { transform: translateY(1px); }
button:focus-visible { outline: 3px solid rgb(0 149 246 / 28%); outline-offset: 2px; }
button[data-variant="primary"] { color: #fff; background: var(--dm-action); }
button[data-variant="primary"]:hover { background: var(--dm-action-active); }
button:disabled { cursor: default; opacity: .5; }
@keyframes dm-panel-in { from { opacity: 0; transform: translateY(5px); } }
@media (prefers-reduced-motion: reduce) {
  section { animation: none; }
  button:active { transform: none; }
}
```

Do not add a custom close button, click-outside cancellation, external icon,
font import, or runtime theme listener.

- [ ] **Step 6: Run dialog tests, typecheck, and inspect the focused diff**

Run:

```powershell
pnpm test -- src/ui/copy-dialog.test.ts
pnpm typecheck
git diff --check -- src/ui/copy-dialog.ts src/ui/copy-dialog.test.ts
```

Expected: all dialog tests pass, TypeScript exits `0`, and `git diff --check`
prints no errors.

- [ ] **Step 7: Commit the dialog polish**

```powershell
git add -- src/ui/copy-dialog.ts src/ui/copy-dialog.test.ts
git commit -m "feat(ui): polish copy session dialog"
```

Expected: one commit containing only the dialog implementation and its tests.

---

### Task 2: Polish toasts and close final validation

**Files:**
- Create: `src/ui/toast.test.ts`
- Modify: `src/ui/toast.ts`

**Interfaces:**
- Consumes: existing calls to `showToast(message: string, kind: ToastKind): void`.
- Produces: the same synchronous lazy toast behavior with stable hooks `data-dm2text-toast`, `data-kind`, `data-dm2text-indicator`, and `data-dm2text-message`.

- [ ] **Step 1: Write failing toast structure and cleanup tests**

Create `src/ui/toast.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { showToast } from './toast';

describe('showToast', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('.dm2text-root').forEach((host) => host.remove());
  });

  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'status'],
    ['error', 'alert'],
  ] as const)('renders %s with the correct semantic role', (kind, role) => {
    showToast('Content-free status', kind);

    const toast = requiredShadow().querySelector('[data-dm2text-toast]');
    expect(toast?.getAttribute('role')).toBe(role);
    expect(toast?.getAttribute('data-kind')).toBe(kind);
    expect(
      requiredShadow().querySelector('[data-dm2text-indicator]')?.getAttribute(
        'aria-hidden',
      ),
    ).toBe('true');
    expect(
      requiredShadow().querySelector('[data-dm2text-message]')?.textContent,
    ).toBe('Content-free status');
  });

  it('removes the owned host when clicked', () => {
    showToast('Copied 50 messages.', 'success');

    requiredShadow()
      .querySelector<HTMLElement>('[data-dm2text-toast]')
      ?.click();

    expect(document.querySelector('.dm2text-root')).toBeNull();
  });

  it('removes the owned host after four seconds', () => {
    vi.useFakeTimers();
    showToast('Copied 50 messages.', 'success');

    vi.advanceTimersByTime(3_999);
    expect(document.querySelector('.dm2text-root')).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(document.querySelector('.dm2text-root')).toBeNull();
  });
});

function requiredShadow(): ShadowRoot {
  const root = document.querySelector<HTMLElement>('.dm2text-root')?.shadowRoot;
  if (!root) throw new Error('Toast shadow root not found');
  return root;
}
```

- [ ] **Step 2: Run the toast tests and verify they fail on missing hooks**

Run:

```powershell
pnpm test -- src/ui/toast.test.ts
```

Expected: FAIL because the toast currently stores the message directly in one
unlabelled `div` and has no indicator/message hooks.

- [ ] **Step 3: Add semantic toast children without changing its public API**

In `showToast()`, replace `toast.textContent = message` with:

```ts
toast.setAttribute('data-dm2text-toast', '');
const indicator = document.createElement('span');
indicator.setAttribute('data-dm2text-indicator', '');
indicator.setAttribute('aria-hidden', 'true');
const copy = document.createElement('span');
copy.setAttribute('data-dm2text-message', '');
copy.textContent = message;
toast.append(indicator, copy);
```

Keep the existing role mapping, `data-kind`, click listener with `{ once:
true }`, `window.setTimeout(remove, 4_000)`, and lazy host creation unchanged.

- [ ] **Step 4: Replace toast styles with the shared visual language**

Replace the inline toast style with:

```css
:host {
  --dm-toast: #ffffff;
  --dm-toast-text: #202124;
  --dm-toast-border: rgb(16 17 20 / 12%);
  --dm-info: #0095f6;
  --dm-success: #2e8b57;
  --dm-warning: #b36b00;
  --dm-error: #c6283c;
  color: var(--dm-toast-text);
  font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :host {
    --dm-toast: #24262c;
    --dm-toast-text: #f5f5f7;
    --dm-toast-border: rgb(255 255 255 / 12%);
    --dm-success: #65b884;
    --dm-warning: #e2a84f;
    --dm-error: #ff7b8b;
  }
}
*, *::before, *::after { box-sizing: border-box; }
[data-dm2text-toast] {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(360px, calc(100vw - 32px));
  min-height: 42px;
  padding: 10px 13px;
  border: 1px solid var(--dm-toast-border);
  border-radius: 11px;
  color: var(--dm-toast-text);
  background: var(--dm-toast);
  box-shadow: 0 10px 30px rgb(0 0 0 / 24%);
  cursor: pointer;
  animation: dm-toast-in 140ms cubic-bezier(.2,.8,.2,1);
}
[data-dm2text-indicator] {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--dm-info);
}
[data-kind="success"] [data-dm2text-indicator] { background: var(--dm-success); }
[data-kind="warning"] [data-dm2text-indicator] { background: var(--dm-warning); }
[data-kind="error"] [data-dm2text-indicator] { background: var(--dm-error); }
[data-dm2text-message] { overflow-wrap: anywhere; }
@keyframes dm-toast-in { from { opacity: 0; transform: translateY(5px); } }
@media (prefers-reduced-motion: reduce) {
  [data-dm2text-toast] { animation: none; }
}
```

Do not add icons, close controls, stacking infrastructure, or a global toast
manager.

- [ ] **Step 5: Run narrow-to-broad automated validation**

Run in order:

```powershell
pnpm test -- src/ui/toast.test.ts
pnpm test -- src/ui/copy-dialog.test.ts src/ui/toast.test.ts
pnpm test
pnpm typecheck
pnpm build
pnpm zip
```

Expected: every command exits `0`; the full test count is at least the current
106 plus the new dialog and toast cases.

- [ ] **Step 6: Verify bundle budgets against the fresh package**

Run:

```powershell
$jsFiles = @(Get-ChildItem -LiteralPath '.output\chrome-mv3' -Recurse -Filter '*.js')
$zipFiles = @(Get-ChildItem -LiteralPath '.output' -Recurse -Filter '*.zip')
if ($jsFiles.Count -eq 0) { throw 'No JavaScript build output found' }
if ($zipFiles.Count -ne 1) {
  throw "Expected exactly one current zip, found $($zipFiles.Count)"
}
$jsBytes = ($jsFiles | Measure-Object -Property Length -Sum).Sum
$zipBytes = ($zipFiles | Measure-Object -Property Length -Sum).Sum
"JavaScript bytes: $jsBytes"
"Zip bytes: $zipBytes"
if ($jsBytes -ge 60000) { throw 'JavaScript budget exceeded' }
if ($zipBytes -ge 200000) { throw 'Package budget exceeded' }
```

Expected: JavaScript remains below `60,000` bytes and the ZIP remains below
`200,000` bytes.

- [ ] **Step 7: Perform the focused visual acceptance matrix**

Reload WXT's unpacked development extension and inspect only DM2Text-owned UI:

| Check | Light theme | Dark theme |
|---|---:|---:|
| Count dialog is centered, compact, and legible | Pass | Pass |
| Input focus ring and inline error are visible | Pass | Pass |
| Progress line and `X of Y messages` agree | Pass | Pass |
| Partial confirmation preserves `Copy X` and Cancel | Pass | Pass |
| Success, warning, and error toasts remain readable | Pass | Pass |
| Escape and Cancel remove session UI | Pass | Pass |
| 360 px-wide viewport keeps 16 px gutters | Pass | Pass |
| Reduced motion disables entry animations | Pass | Pass |

Do not copy real conversation content into screenshots, logs, fixtures, or the
repository. The existing manual transcript matrix does not need to be repeated
because no session or parser behavior changes.

- [ ] **Step 8: Commit the toast polish after all checks pass**

```powershell
git add -- src/ui/toast.ts src/ui/toast.test.ts
git commit -m "feat(ui): polish session toasts"
git status --short --branch
```

Expected: the two UI commits are present. The only untracked paths may be the
pre-existing MVP plan and the local `.superpowers/` visual-companion output;
neither is committed.
