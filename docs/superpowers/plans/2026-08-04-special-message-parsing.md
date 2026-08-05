# Special Message Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy shared Instagram posts in a structured format, extract substantive Meta AI answers, and prevent profiles nested in cards from changing the outer message sender.

**Architecture:** Extend the normalized transcript content union with a semantic `shared-post` variant, then teach the Instagram adapter to classify shared-post and Meta AI structures before its generic text/media fallback. Keep DOM assumptions in `src/instagram/`, preserve sender-independent signatures, and render structured content only in the transcript formatter.

**Tech Stack:** WXT, Manifest V3, vanilla TypeScript, native DOM APIs, Vitest with jsdom, pnpm.

## Global Constraints

- Preserve the existing copy-session, collection, immutable-anchor, chronological-order, cancellation, restoration, and cleanup behavior.
- Do not add runtime dependencies, background workers, polling, or permanent UI.
- Do not persist or log conversation content and do not initiate fetch, XHR, WebSocket, beacon, or extension-originated network requests.
- The only external output permitted is the user-requested operating-system clipboard write.
- Keep all Instagram DOM assumptions under `src/instagram/` and selectors centralized in `src/instagram/selectors.ts`.
- Treat missing DOM data as recoverable and preserve `Unknown` plus existing sender-group backfilling when attribution remains ambiguous.
- Use only anonymized fixtures; never commit thread IDs, real usernames, or real conversation text.
- Keep total minified JavaScript under 60 KB and the packaged extension under 200 KB.
- Use pnpm for every package and script command.
- Commit messages must use `type(scope): description`.

---

## File Map

- `src/transcript/types.ts`: add the normalized shared-post content shape.
- `src/transcript/format.ts`: render the approved two-line shared-post transcript representation.
- `src/transcript/format.test.ts`: prove full, partial, multiline, and reply formatting.
- `src/instagram/selectors.ts`: centralize shared-post permalink and embedded-content selectors.
- `src/instagram/parse-message.ts`: classify shared posts and Meta AI answers and scope sender evidence to message chrome.
- `src/instagram/parse-message.test.ts`: verify parsing, sender attribution, signatures, and recoverable missing content.
- `tests/fixtures/instagram/special-messages.html`: anonymized DOM examples for shared posts and Meta AI.

### Task 1: Add the normalized shared-post format

**Files:**
- Modify: `src/transcript/types.ts`
- Modify: `src/transcript/format.ts`
- Test: `src/transcript/format.test.ts`

**Interfaces:**
- Consumes: existing `MessageContent`, `TranscriptMessage`, `formatTranscript(messages)`.
- Produces: `MessageContent` variant `{ type: 'shared-post'; source?: string; caption?: string }` and its transcript representation.

- [ ] **Step 1: Write failing formatter tests**

Append these cases inside the existing `describe('formatTranscript', ...)` block:

```ts
it('formats a shared post with its source and multiline caption', () => {
  expect(
    formatTranscript([
      {
        key: 'shared',
        signature: 'shared',
        sender: 'Person A',
        content: {
          type: 'shared-post',
          source: 'source.account',
          caption: 'First line\nSecond line',
        },
      },
    ]),
  ).toBe(
    'Person A: [shared post by source.account]\n' +
      '  Caption: First line\\nSecond line',
  );
});

it('formats partial shared posts without inventing missing fields', () => {
  const messages: TranscriptMessage[] = [
    {
      key: 'source-only',
      signature: 'source-only',
      sender: 'Person A',
      content: { type: 'shared-post', source: 'source.account' },
    },
    {
      key: 'caption-only',
      signature: 'caption-only',
      sender: 'You',
      content: { type: 'shared-post', caption: 'Visible caption' },
      reply: { sender: 'Person A', preview: 'Earlier message' },
    },
  ];

  expect(formatTranscript(messages)).toBe(
    [
      'Person A: [shared post by source.account]',
      'You (replying to Person A: Earlier message): [shared post]',
      '  Caption: Visible caption',
    ].join('\n'),
  );
});
```

- [ ] **Step 2: Run the narrow test and verify the type-level failure**

Run:

```powershell
pnpm exec vitest run src/transcript/format.test.ts
```

Expected: FAIL because `shared-post` is not assignable to `MessageContent` or is not formatted.

- [ ] **Step 3: Extend the normalized type**

Change `MessageContent` in `src/transcript/types.ts` to:

```ts
export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'media'; label: string }
  | { type: 'mixed'; text: string; label: string }
  | { type: 'shared-post'; source?: string; caption?: string };
```

The Instagram adapter added in Task 2 is responsible for creating this variant only when at least one optional field is non-empty.

- [ ] **Step 4: Render the structured content**

Add this branch at the start of `formatContent` in `src/transcript/format.ts`:

```ts
if (content.type === 'shared-post') {
  const source = normalizeInline(content.source ?? '');
  const caption = normalizeMessageText(content.caption ?? '');
  const header = source
    ? `[shared post by ${source}]`
    : '[shared post]';

  return caption ? `${header}\n  Caption: ${caption}` : header;
}
```

Keep the existing `text`, `media`, and `mixed` branches unchanged after it.

- [ ] **Step 5: Run the formatter tests**

Run:

```powershell
pnpm exec vitest run src/transcript/format.test.ts
```

Expected: all tests in `src/transcript/format.test.ts` PASS.

- [ ] **Step 6: Commit the normalized contract**

```powershell
git add -- src/transcript/types.ts src/transcript/format.ts src/transcript/format.test.ts
git commit -m "feat(transcript): format shared posts"
```

### Task 2: Parse shared posts and substantive Meta AI answers

**Files:**
- Create: `tests/fixtures/instagram/special-messages.html`
- Modify: `src/instagram/selectors.ts`
- Modify: `src/instagram/parse-message.ts`
- Test: `src/instagram/parse-message.test.ts`

**Interfaces:**
- Consumes: the `shared-post` content variant from Task 1, `parseMessage(root, context)`, and `parseMountedWindow(scroller, anchorRoot?)`.
- Produces: `SHARED_POST_PERMALINK_SELECTOR`, `EMBEDDED_CONTENT_SELECTOR`, `parseSharedPost(root)`, and `parseMetaAiAnswer(root)`; these helpers remain private except for selector constants.

- [ ] **Step 1: Create the anonymized DOM fixture**

Create `tests/fixtures/instagram/special-messages.html` with:

```html
<div aria-label="Messages">
  <div id="shared-full" role="row" aria-label="Message">
    <span aria-label="Sender">Person A</span>
    <div role="button" data-shared-post-card>
      <a href="/source.account/" aria-label="Open the profile page of source.account">
        <img alt="user-profile-picture" />
      </a>
      <a href="/p/example-post/"><img alt="Photo by source.account" /></a>
      <div dir="auto">First line
Second line</div>
    </div>
  </div>
  <div id="shared-source-only" role="row" aria-label="Message">
    <span aria-label="Sender">Person B</span>
    <div role="button" data-shared-post-card>
      <a href="/source.only/" aria-label="Profile of source.only">
        <img alt="user-profile-picture" />
      </a>
      <a href="/reel/example-reel/"><video></video></a>
    </div>
  </div>
  <div id="shared-caption-only" role="row" aria-label="Sent by you">
    <div role="button" data-shared-post-card>
      <a href="/p/another-post/"><img alt="Photo" /></a>
      <div dir="auto">Caption without a visible source</div>
    </div>
  </div>
  <div id="meta-answer" role="row" aria-label="Message">
    <span aria-label="Sender">Meta AI</span>
    <div dir="auto">A substantive answer.</div>
    <div dir="auto">Generated by AI</div>
  </div>
  <div id="meta-badge-only" role="row" aria-label="Message">
    <span aria-label="Sender">Meta AI</span>
    <div dir="auto">Generated by AI</div>
  </div>
</div>
```

The `data-shared-post-card` attribute makes the fixture readable but production discovery must rely on the permalink structure, not that test-only attribute.

- [ ] **Step 2: Write failing parsing tests**

Add `'special-messages'` to the `loadFixture` name union, then add these tests:

```ts
it('parses shared posts structurally without a redundant media marker', () => {
  loadFixture('special-messages');

  expect(parseMessage(requiredElement('#shared-full'))?.content).toEqual({
    type: 'shared-post',
    source: 'source.account',
    caption: 'First line\nSecond line',
  });
  expect(parseMessage(requiredElement('#shared-source-only'))?.content).toEqual({
    type: 'shared-post',
    source: 'source.only',
  });
  expect(parseMessage(requiredElement('#shared-caption-only'))?.content).toEqual({
    type: 'shared-post',
    caption: 'Caption without a visible source',
  });
});

it('keeps shared-post signatures stable when sender evidence changes', () => {
  loadFixture('special-messages');
  const incoming = parseMessage(requiredElement('#shared-full'));
  const clone = requiredElement('#shared-full').cloneNode(true) as HTMLElement;
  clone.setAttribute('aria-label', 'Sent by you');
  clone.querySelector('[aria-label="Sender"]')?.remove();

  expect(incoming?.signature).toBe(parseMessage(clone)?.signature);
});

it('extracts a Meta AI answer instead of its presentation badge', () => {
  loadFixture('special-messages');

  expect(parseMessage(requiredElement('#meta-answer'))?.content).toEqual({
    type: 'text',
    text: 'A substantive answer.',
  });
  expect(parseMessage(requiredElement('#meta-badge-only'))).toBeNull();
});
```

- [ ] **Step 3: Run the adapter tests and verify the failures**

Run:

```powershell
pnpm exec vitest run src/instagram/parse-message.test.ts
```

Expected: FAIL because shared posts still become generic mixed media and Meta AI still selects `Generated by AI`.

- [ ] **Step 4: Centralize the embedded-card selectors**

Add to `src/instagram/selectors.ts`:

```ts
export const SHARED_POST_PERMALINK_SELECTOR = [
  'a[href*="/p/"]',
  'a[href*="/reel/"]',
].join(', ');

export const EMBEDDED_CONTENT_SELECTOR = [
  REPLY_SELECTOR,
  '[data-shared-post-card]',
].join(', ');
```

`data-shared-post-card` supports deterministic tests only. The parser locates a production card from `SHARED_POST_PERMALINK_SELECTOR` and then uses its closest `[role="button"]` container.

- [ ] **Step 5: Add specialized content parsing before the generic fallback**

Import `SHARED_POST_PERMALINK_SELECTOR` in `src/instagram/parse-message.ts`. Change the start of `parseMessage` to resolve explicit sender evidence before content, then use geometry only for ambiguous text and shared-post structures:

```ts
const initialSender = parseSender(root, context, false);
const content = parseContent(root, initialSender);
if (!content) return null;
const allowLayoutInference =
  content.type === 'text' || content.type === 'shared-post';
const sender =
  initialSender === 'Unknown' && allowLayoutInference
    ? parseSender(root, context, true)
    : initialSender;
```

Remove the later duplicate `sender` declaration. Change `parseContent` and add these helpers:

```ts
const AI_PRESENTATION_LABELS = new Set(['Generated by AI']);

function parseContent(
  root: HTMLElement,
  sender: string,
): MessageContent | null {
  const sharedPost = parseSharedPost(root);
  if (sharedPost) return sharedPost;

  if (sender.toLocaleLowerCase() === 'meta ai') {
    const answer = parseMetaAiAnswer(root);
    return answer ? { type: 'text', text: answer } : null;
  }

  const textRoot =
    root.querySelector<HTMLElement>(TEXT_CONTENT_SELECTOR) ??
    findLeafTextNodes(root).at(-1);
  const text = normalizeMultiline(textRoot?.textContent ?? '');
  const media = findMedia(root);
  const label = media ? parseMediaLabel(media) : '';

  if (text && label) return { type: 'mixed', text, label };
  if (text) return { type: 'text', text };
  if (label) return { type: 'media', label };
  return null;
}

function parseSharedPost(root: HTMLElement): MessageContent | null {
  const permalink = root.querySelector<HTMLAnchorElement>(
    SHARED_POST_PERMALINK_SELECTOR,
  );
  const card = permalink?.closest<HTMLElement>('[role="button"]');
  if (!card) return null;

  const source = parseProfileSender(
    card.querySelector<HTMLAnchorElement>(PROFILE_LINK_SELECTOR),
  );
  const caption = findLeafTextNodes(card)
    .filter((candidate) => !candidate.closest(PROFILE_LINK_SELECTOR))
    .map((candidate) => normalizeMultiline(candidate.textContent ?? ''))
    .filter(Boolean)
    .join('\n');

  if (!source && !caption) return null;
  return {
    type: 'shared-post',
    ...(source ? { source } : {}),
    ...(caption ? { caption } : {}),
  };
}

function parseMetaAiAnswer(root: HTMLElement): string {
  return findLeafTextNodes(root)
    .filter((candidate) => !candidate.closest(REPLY_SELECTOR))
    .filter((candidate) => !candidate.closest(PROFILE_LINK_SELECTOR))
    .filter((candidate) => !candidate.closest(MESSAGE_ACTIONS_SELECTOR))
    .map((candidate) => normalizeMultiline(candidate.textContent ?? ''))
    .filter((text) => text && !AI_PRESENTATION_LABELS.has(text))
    .join('\n');
}
```

Also import `MESSAGE_ACTIONS_SELECTOR`. This two-pass sender resolution preserves the existing rule that generic media alignment is not sufficient to infer `You`, while allowing an outer shared-post wrapper to be evaluated after the content has been classified.

- [ ] **Step 6: Run the special-content tests**

Run:

```powershell
pnpm exec vitest run src/instagram/parse-message.test.ts src/transcript/format.test.ts
```

Expected: all tests in both files PASS.

- [ ] **Step 7: Commit special-content parsing**

```powershell
git add -- tests/fixtures/instagram/special-messages.html src/instagram/selectors.ts src/instagram/parse-message.ts src/instagram/parse-message.test.ts
git commit -m "feat(instagram): parse special message content"
```

### Task 3: Restrict sender evidence to message-level chrome

**Files:**
- Modify: `src/instagram/parse-message.ts`
- Modify: `src/instagram/selectors.ts`
- Test: `src/instagram/parse-message.test.ts`

**Interfaces:**
- Consumes: `parseSharedPost`, `SHARED_POST_PERMALINK_SELECTOR`, existing geometry inference, and existing `parseMountedWindow` sender backfilling.
- Produces: `findMessageLevelProfileLink(root)` and `findMessageLevelContentRoot(root)` as private parser helpers; public parser signatures remain unchanged.

- [ ] **Step 1: Write failing nested-profile sender regressions**

Add these tests to `src/instagram/parse-message.test.ts`:

```ts
it('does not use a profile nested in a shared card as the outer sender', () => {
  document.body.innerHTML = `
    <div id="scroller">
      <div id="message">
        <div role="group">
          <div style="display:flex;align-items:flex-end;justify-content:flex-end">
            <div style="display:flex;align-items:center;flex-direction:row-reverse">
              <div role="button" data-shared-post-card>
                <a href="/nested.source/" aria-label="Profile of nested.source">
                  <img alt="user-profile-picture" />
                </a>
                <a href="/p/nested-post/"><img alt="Photo" /></a>
                <div dir="auto">Nested caption</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  expect(
    parseMessage(requiredElement('#message'), {
      scroller: requiredElement('#scroller'),
    })?.sender,
  ).toBe('You');
});

it('leaves an incoming card ambiguous instead of using its nested profile', () => {
  document.body.innerHTML = `
    <div id="scroller">
      <div id="message">
        <div role="group">
          <div style="display:flex;align-items:flex-end;justify-content:flex-start">
            <div role="button" data-shared-post-card>
              <a href="/nested.source/" aria-label="Profile of nested.source">
                <img alt="user-profile-picture" />
              </a>
              <a href="/reel/nested-reel/"><video></video></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  expect(
    parseMessage(requiredElement('#message'), {
      scroller: requiredElement('#scroller'),
    })?.sender,
  ).toBe('Unknown');
});
```

- [ ] **Step 2: Run the nested-profile tests and verify the failure**

Run:

```powershell
pnpm exec vitest run src/instagram/parse-message.test.ts -t "nested"
```

Expected: FAIL because the nested profile is currently returned as the outer sender.

- [ ] **Step 3: Scope explicit sender and profile evidence**

Import `EMBEDDED_CONTENT_SELECTOR` in `src/instagram/parse-message.ts`. Replace the visible-sender and profile-link portion of `parseSender` with:

```ts
const visibleSender = Array.from(
  root.querySelectorAll<HTMLElement>(SENDER_SELECTOR),
)
  .filter((candidate) => !isInsideEmbeddedContent(candidate, root))
  .map((candidate) => normalizeInline(candidate.textContent ?? ''))
  .find(Boolean);
if (visibleSender) return visibleSender;

const profileSender = parseProfileSender(findMessageLevelProfileLink(root));
if (profileSender) return profileSender;
```

Add:

```ts
function findMessageLevelProfileLink(
  root: HTMLElement,
): HTMLAnchorElement | null {
  return (
    Array.from(
      root.querySelectorAll<HTMLAnchorElement>(PROFILE_LINK_SELECTOR),
    ).find((candidate) => !isInsideEmbeddedContent(candidate, root)) ?? null
  );
}

function isInsideEmbeddedContent(
  candidate: Element,
  root: HTMLElement,
): boolean {
  const sharedPermalink = candidate
    .closest<HTMLElement>('[role="button"]')
    ?.querySelector(SHARED_POST_PERMALINK_SELECTOR);
  if (sharedPermalink) return true;

  const embedded = candidate.closest(EMBEDDED_CONTENT_SELECTOR);
  return embedded !== null && embedded !== root;
}
```

This rejects both fixture-marked cards and production cards recognized by a post/reel permalink.

- [ ] **Step 4: Restrict geometry to the outer content wrapper**

Replace the first line of `inferSenderFromGeometry` that chooses `contentRoot` with:

```ts
const contentRoot = findMessageLevelContentRoot(root);
```

Add:

```ts
function findMessageLevelContentRoot(root: HTMLElement): HTMLElement {
  const specializedCard = root
    .querySelector(SHARED_POST_PERMALINK_SELECTOR)
    ?.closest<HTMLElement>('[role="button"]');
  const candidate = specializedCard?.parentElement ??
    findLeafTextNodes(root)
      .filter((element) => !isInsideEmbeddedContent(element, root))
      .at(-1) ??
    findMedia(root) ??
    root;

  return candidate;
}
```

Keep the two-pass `parseMessage` flow from Task 2 and the established `hasOutgoingLayout` ancestor walk. For shared posts, that walk now begins at the outer card wrapper instead of an internally aligned descendant. Generic media continues to skip layout inference entirely.

- [ ] **Step 5: Run the full Instagram adapter suite**

Run:

```powershell
pnpm exec vitest run src/instagram/parse-message.test.ts
```

Expected: all Instagram adapter tests PASS, including existing offscreen text/media and sender-backfill regressions.

- [ ] **Step 6: Run complete validation**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Expected:

- all Vitest tests PASS;
- TypeScript exits with code 0;
- WXT production build exits with code 0;
- the build reports no new runtime dependency or network capability.

Measure artifacts:

```powershell
$jsBytes = (Get-ChildItem -Recurse '.output\chrome-mv3' -Filter '*.js' | Measure-Object -Property Length -Sum).Sum
$packageBytes = (Get-ChildItem -Recurse '.output\chrome-mv3' -File | Measure-Object -Property Length -Sum).Sum
Write-Output "JavaScript bytes: $jsBytes"
Write-Output "Package bytes: $packageBytes"
```

Expected: JavaScript bytes are below `61440`; package bytes are below `204800`.

- [ ] **Step 7: Commit sender hardening**

```powershell
git add -- src/instagram/selectors.ts src/instagram/parse-message.ts src/instagram/parse-message.test.ts
git commit -m "fix(instagram): isolate outer message sender"
```

### Task 4: Manual development-flow checkpoint

**Files:**
- No committed file changes expected.

**Interfaces:**
- Consumes: the completed parser, formatter, and existing WXT content-script integration.
- Produces: manual confirmation against one locally selected group DM; no conversation identifiers or captured content are stored.

- [ ] **Step 1: Start WXT development mode**

Run:

```powershell
pnpm dev
```

Expected: WXT starts the development extension and prints the development output directory without a compile error.

- [ ] **Step 2: Verify the three corrected structures locally**

In one locally selected group DM, trigger `Copy context` on a range containing each available structure and verify:

```text
Person A: [shared post by source.account]
  Caption: Visible caption
Meta AI: Substantive visible answer
You: [shared post by source.account]
```

Expected:

- a shared post has one structured header and optional indented caption, without a redundant `[image]`;
- Meta AI contains its visible response and not only `Generated by AI`;
- a nested source profile does not replace `You` or the real outer sender;
- the selected anchor remains the final copied message;
- no extension-originated network request or conversation persistence occurs.

- [ ] **Step 3: Record only the checkpoint result**

Do not add chat URLs, usernames, copied transcripts, screenshots, or DOM dumps to the repository. If the checkpoint passes, report the count used and the three behavior results in the task handoff only. If a structure is unavailable in the mounted local conversation, report that limitation without inventing a pass.

## Self-review checklist

- Every acceptance criterion in `docs/superpowers/specs/2026-08-04-special-message-parsing-design.md` maps to Tasks 1-4.
- Shared-post property names are consistently `source` and `caption` in types, parser, tests, and formatter.
- The parser creates `shared-post` only when `source` or `caption` is non-empty.
- Meta AI returns `null` when only its presentation badge is mounted.
- Sender and timestamp remain outside the signature.
- The plan adds no dependency, persistence, logging, network behavior, polling, or unrelated feature.
