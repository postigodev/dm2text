# DM2Text

Copy clean, structured context from Instagram Direct without sending your conversations anywhere.

DM2Text adds a native-looking **Copy context** action to each message menu. Select an end message, choose how many messages you need, and the extension collects the preceding context into a chronological transcript on your clipboard.

## Features

- Uses the selected message as an immutable end anchor.
- Collects older messages automatically through Instagram's virtualized chat history.
- Preserves senders, visible timestamps, text, replies, media labels, shared posts, emoji, and Meta AI responses when available.
- Keeps messages ordered from oldest to newest and excludes anything after the anchor.
- Supports cancellation, partial-copy confirmation, and best-effort viewport restoration.
- Matches Instagram's light or dark appearance with a small, native-looking interface.
- Processes conversation content locally with no persistence or extension-originated network traffic.

## Install

1. Download `dm2text-0.1.0-chrome.zip` from the [latest release](https://github.com/postigodev/dm2text/releases/latest).
2. Extract the ZIP to a permanent folder.
3. Open `chrome://extensions` in Chrome or another Chromium browser.
4. Enable **Developer mode**.
5. Choose **Load unpacked** and select the extracted folder.

> [!IMPORTANT]
> Keep the extracted folder after installation. The browser loads the extension from that location.

## Use

1. Open a conversation in Instagram Direct.
2. Hover the final message you want in the transcript and open its three-dot menu.
3. Choose **Copy context**.
4. Enter the number of messages to collect.
5. Paste the resulting transcript wherever you need it.

If Instagram cannot expose the full requested range, DM2Text asks before copying the available portion.

### Transcript format

```text
[10:41 AM, Tuesday] Person A: Did you see the draft?
You (replying to Person A: Did you see the draft?): Yes, sending notes now.
Person B: [shared post by example.account]
  Caption: A visible post caption
Person A: [image]
```

## Privacy

Conversation data exists only in page memory while a copy session is active. DM2Text does not persist message content and initiates no fetch, XHR, WebSocket, beacon, or other extension-originated network request.

The only intentional output is the transcript you request on the operating-system clipboard. Clipboard contents remain available to the operating system and other applications until replaced.

## Local development

Install [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/), then run:

```powershell
pnpm install
pnpm dev
```

While WXT is running, open the browser's extension manager, enable **Developer mode**, choose **Load unpacked**, and select `.output/chrome-mv3-dev`.

Useful commands:

```powershell
pnpm test       # Run the test suite once
pnpm typecheck  # Check strict TypeScript types
pnpm build      # Create a production build
pnpm zip        # Package the production extension
```

The implementation is split by responsibility:

- `src/instagram/` isolates Instagram DOM discovery, parsing, and scrolling.
- `src/collection/` owns the transient copy session.
- `src/transcript/` selects and formats normalized messages.
- `src/ui/` creates the session dialog and toasts only when needed.

## Limitations

Instagram virtualizes conversations and can change its private DOM without notice. DOM changes may require updates to DM2Text's centralized selectors and anonymized fixtures. Data that Instagram does not expose in the mounted page cannot be included, and restoring the selected message to the viewport is best-effort and bounded to three seconds.

The project budgets are less than 60 KB of total minified JavaScript and less than 200 KB for the packaged extension.
