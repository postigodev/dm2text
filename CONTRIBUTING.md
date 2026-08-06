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
