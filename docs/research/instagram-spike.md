# Instagram technical spike

- Date: 2026-08-04
- Browser: Chrome 150.0.7871.187
- Extension build: `0.0.0-dev+23f3f4e` with WXT 0.21.3
- Evidence policy: boolean structural results only; no conversation content,
  account identifiers, thread identifiers, profile URLs, or screenshots.

| Check | Group | Individual | SPA entry |
|---|---:|---:|---:|
| Menu anchor captured | Pass | Pass | Pass |
| Action injected once | Pass | Pass | Pass |
| Menu closed after custom action | Pass | Pass | Pass |
| Correct scroller found | Pass | Pass | Pass |
| Older mounted structure detected | Pass | Pass | Pass |
| Clipboard write after 2.5 seconds | Pass | Pass | Pass |
| Selected node restored | Pass | Pass | Pass |

## Resolved failure categories

- `spa-listener-not-installed-from-home`: resolved by installing one
  development-only delegated listener and applying the `/direct/` guard inside
  its click handler.
- `direct-child-count-insufficient`: resolved by treating a changed set of
  visible structural nodes as evidence of older mounted structure, in addition
  to child-list mutation and a content-free structural signature.

No production selectors or transcript abstractions were created during the
spike.
