# DM2Text

DM2Text is a lightweight, local-first browser extension that copies a
structured transcript ending at a selected Instagram Direct message.

## MVP scope

The extension must:

1. Add a "Copy context" action to each message's three-dot menu.
2. Treat the selected message as the immutable end anchor.
3. Ask for the number of messages to copy.
4. Automatically collect previous messages through upward scrolling.
5. Preserve sender, timestamp, text, media type, and reply context when available.
6. Copy the transcript from oldest to newest.
7. Attempt to return the viewport to the selected message.

Do not add unrelated features unless explicitly requested.

## Stack

- WXT
- Manifest V3
- Vanilla TypeScript
- Native DOM APIs
- Plain CSS
- Vitest
- pnpm

## Architecture

Keep Instagram-specific DOM logic isolated from the transcript core.

- `src/instagram/`: DOM discovery, selectors, parsing, scrolling.
- `src/collection/`: transient copy session and message collection.
- `src/transcript/`: normalized types, selection, and formatting.
- `src/ui/`: lazily created dialog and toast.

Prefer pure functions outside `src/instagram/`.

Keep selectors centralized. Do not spread Instagram DOM assumptions across
the codebase.

## Performance budget

- No runtime dependencies.
- No frontend framework.
- No permanent background worker.
- No polling or `setInterval`.
- Do not continuously parse conversation messages.
- Parse messages only after the user requests a copy.
- Create the dialog and toast lazily.
- Remove injected UI when it is closed.
- Store only user preferences, never conversation content.
- Make no external network requests.

Initial build targets:

- Total JavaScript under 60 KB minified.
- Packaged extension under 200 KB.

## Collection behavior

Instagram virtualizes its conversation DOM. DM2Text must not rely on all
requested messages being mounted simultaneously.

When copying N messages:

1. Capture the selected message as the immutable end anchor.
2. Accumulate mounted messages in transient memory.
3. Automatically scroll upward and collect newly mounted messages.
4. Deduplicate messages across DOM windows.
5. Continue until N messages ending at the anchor are collected, the
   beginning is reached, the user cancels, or collection stalls.
6. Copy messages from oldest to newest.
7. Attempt to restore the selected message to the viewport.
8. Destroy all collected conversation data after completion.

Do not persist message content.
Do not scan unless a copy session is active.
Support cancellation and always clean up observers and temporary state.

## Coding rules

- Prefer the smallest correct implementation.
- Do not add dependencies without explicit approval.
- Do not refactor unrelated code.
- Do not create abstractions before they are used.
- Avoid duplicated DOM scans.
- Use strict TypeScript types; avoid `any`.
- Keep functions small and name behavior explicitly.
- Treat missing DOM data as recoverable, not exceptional.
- Never log message contents in production.
- Preserve user-visible behavior when changing internals.

## Testing

Prioritize deterministic unit tests for:

- selecting N messages ending at an anchor;
- chronological ordering;
- deduplication;
- transcript formatting;
- replies inside and outside the selected range;
- collection stall and cancellation behavior.

Use anonymized HTML fixtures for Instagram parsing.

Do not add browser end-to-end testing during the initial MVP unless explicitly
requested.

## Codex workflow

Before editing:

1. Read this file.
2. Inspect only the files relevant to the requested task.
3. State a brief implementation plan.
4. Make the smallest coherent change.
5. Run the narrowest relevant tests first.
6. Report changed files, tests run, and remaining limitations.

Do not scan or summarize the entire repository unless necessary.
Do not rewrite working files merely for stylistic consistency.