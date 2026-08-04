# DM2Text

DM2Text is a lightweight, local-first browser extension that copies a structured transcript ending at a message you select in Instagram Direct.

## Local development

```powershell
pnpm install
pnpm dev
```

While WXT is running, open Chromium's extension manager, enable Developer mode, choose **Load unpacked**, and select WXT's generated development Chromium directory under `.output`.

## Usage

1. Open a conversation in Instagram Direct.
2. Hover the final message you want in the transcript and open its three-dot menu.
3. Choose **Copy context**.
4. Enter the number of messages to collect.
5. If Instagram cannot expose the full range, explicitly confirm whether to copy the available portion.

The transcript is ordered from oldest to newest. It includes sender and message content, plus timestamps, media labels, and reply context when Instagram exposes them in the mounted conversation DOM.

## Privacy

Conversation data is processed transiently in page memory only while a copy session is active. DM2Text does not persist message content and initiates no fetch, XHR, WebSocket, beacon, or extension-originated network request.

The one intentional output is the transcript write requested by the user to the operating-system clipboard. Clipboard contents remain available to the operating system and other applications until the user or another application replaces them.

## Limitations

Instagram virtualizes conversations and can change its private DOM without notice. Such changes may require updates to the centralized selectors and anonymized HTML fixtures. Viewport restoration is best-effort and bounded to three seconds.

## Validation

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm zip
```

The initial budgets are less than 60 KB of total minified JavaScript and less than 200 KB for the packaged extension.
