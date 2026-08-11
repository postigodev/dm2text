# DM2Text Marketing Website Design

**Date:** August 10, 2026  
**Status:** Approved for implementation planning

## Objective

Build a small, production-ready marketing website for DM2Text at
`https://dm2text.postigo.sh`. The site must accurately explain the existing
browser extension, make its local-first privacy model clear, link users to the
current installation path, and provide a complete privacy policy suitable for
the Chrome Web Store listing.

The website is a separate static Astro project under `website/`. It must not
change the extension's runtime behavior, WXT configuration, root dependencies,
or release packaging.

## Scope

The site has exactly two routes:

- `/` — product landing page;
- `/privacy` — complete privacy policy.

It uses Astro, TypeScript, Tailwind CSS v4, `@lucide/astro`, and
`@tailwindcss/typography`. It does not use React, Next.js, shadcn/ui, animation
libraries, a backend, analytics, trackers, external APIs, or client hydration.

The site is informational. It does not read Instagram data, access the
clipboard, install the extension directly, submit forms, persist user data, or
set cookies.

## Chosen direction

Use the approved **Editorial product spotlight** direction:

- a soft off-white canvas with dark navy typography;
- restrained lavender and blue glow gradients;
- the existing DM2Text purple, rose, and blue accent language;
- an asymmetrical hero with copy on the left and a large dark product mockup on
  the right;
- generous whitespace, 18–24px radii, subtle borders, and soft shadows;
- a dark privacy section that punctuates the otherwise light page;
- crisp typography and restrained CSS-only motion.

This direction adapts the supplied dark reference's composition without
copying its invented product UI or personal conversation content. It avoids a
generic SaaS dashboard appearance and excessive glassmorphism.

Two alternatives were considered and rejected:

1. A centered cinematic hero creates drama but delays practical product proof
   and resembles a conventional launch page.
2. A modular proof grid is easy to scan but risks the card-heavy SaaS aesthetic
   excluded by the brief.

## Project architecture

`website/` is an independently installable pnpm project with its own
`package.json`, `pnpm-lock.yaml`, TypeScript configuration, Astro configuration,
and README. Running commands inside `website/` must not install or mutate the
extension project.

Proposed responsibilities:

```text
website/
├── public/
│   └── brand/                 # exact copies of existing DM2Text icon assets
├── scripts/
│   └── verify-static-output.mjs
├── src/
│   ├── components/
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── HeroMockup.astro
│   │   ├── HowItWorks.astro
│   │   ├── OpenSource.astro
│   │   ├── PrivacyCallout.astro
│   │   └── TranscriptExample.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── privacy.astro
│   ├── styles/
│   │   └── global.css
│   └── config.ts
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── README.md
└── tsconfig.json
```

Components remain presentational and server-rendered. `BaseLayout.astro` owns
the document shell and metadata. `src/config.ts` is the sole source for public
URLs and includes:

```ts
export const SITE_URL = 'https://dm2text.postigo.sh';
export const GITHUB_URL = 'https://github.com/postigodev/dm2text';
export const ISSUES_URL = 'https://github.com/postigodev/dm2text/issues';
export const CHROME_WEB_STORE_URL =
  'https://github.com/postigodev/dm2text/releases/latest';
```

`CHROME_WEB_STORE_URL` deliberately points to the latest GitHub release until
the public Chrome Web Store listing exists. Replacing it must require changing
only this constant. While the fallback is active, the required **Add to
Chrome** CTA remains unchanged and nearby supporting copy states **Manual
installation via GitHub until the Chrome Web Store listing is live.** This
prevents the fallback link from implying a one-click store installation.

The existing Context Ribbon mark and existing PNG icon files are copied
byte-for-byte into the website's public assets. They are not redrawn or
reinterpreted.

## Landing page

### Header

The header contains the existing icon, the DM2Text wordmark, links to
`#how-it-works`, `/privacy`, and GitHub, plus the primary **Add to Chrome** CTA.
On narrow screens, it preserves the brand, Privacy link, and CTA without adding
a JavaScript menu.

### Hero

The hero contains:

- eyebrow: **Local-first · Open source**;
- headline: **Copy Instagram chats into clean, structured text.**;
- body: **DM2Text adds a native-looking Copy context action to Instagram
  Direct. Select an end message, choose how much context you need, and copy a
  chronological transcript — without sending your conversations anywhere.**;
- primary CTA: **Add to Chrome**;
- secondary CTA: **View source**;
- trust row: **Local-first**, **No tracking**, **No servers**.

Until the Chrome Web Store listing is public, concise text next to or directly
below the primary CTA states **Manual installation via GitHub until the Chrome
Web Store listing is live.**

The product mockup is the dominant visual. It depicts a dark, anonymized
Instagram Direct-style conversation with outgoing purple-blue bubbles and a
floating DM2Text dialog. It must not contain real usernames, avatars, message
content, Instagram logos, Meta logos, or claims of affiliation. The dialog
shows exactly:

- **Copy context**;
- **Ends at the selected message**;
- **Messages to include**;
- **50**;
- **Cancel**;
- **Copy**.

The mockup is illustrative and non-interactive. It must not render controls
that appear focusable or submit data.

### How it works

The section is identified by `id="how-it-works"` and uses the heading **One
action. Clean context.** It presents three equal steps on desktop and one
column on mobile:

1. **Choose the endpoint** — Open the menu on the final message you want and
   select Copy context.
2. **Pick the context** — Choose how many messages to include, ending at the
   selected message.
3. **Paste anywhere** — DM2Text puts a clean chronological transcript on your
   clipboard.

Below the steps, a compact dark code sample uses the repository's actual
transcript format:

```text
[10:41 AM, Tuesday] Person A: Did you see the draft?
You (replying to Person A: Did you see the draft?): Yes, sending notes now.
Person B: [shared post by example.account]
  Caption: A visible post caption
Person A: [image]
```

### Privacy callout

A large dark navy section contains:

- heading: **Your DMs stay in your browser.**;
- body: **DM2Text processes conversation content locally. It does not persist
  your messages, send them to the developer, or use analytics or tracking.**;
- facts: **Local processing**, **No persistent storage**, **No analytics**, and
  **No conversation uploads**.

### Open source

The section contains:

- heading: **Built in the open.**;
- body: **DM2Text is open source and licensed under GPL-3.0.**;
- buttons: **View on GitHub** and **Report an issue**;
- disclaimer: **DM2Text is an independent project and is not affiliated with,
  endorsed by, or sponsored by Instagram or Meta.**

### Footer

The footer contains the DM2Text icon and name, links to GitHub, `/privacy`, and
the issue tracker, and **Copyright © 2026 Piero A. Postigo Rocchetti.**

## Privacy page

`/privacy` uses the shared header, footer, typography, focus states, and color
system. Its content column is narrower than the landing page and optimized for
reading. The title is **DM2Text Privacy Policy** and the subtitle is **Last
updated: August 10, 2026**.

The policy is rendered with the following substance and wording:

This is owner-approved policy text and must be reproduced verbatim. The
implementation does not independently expand, qualify, or assert additional
legal or compliance conclusions.

DM2Text is a local-first browser extension that allows users to copy structured
context from Instagram Direct conversations.

### Data handled

When a user explicitly starts a Copy context session, DM2Text may temporarily
process information visible in the Instagram Direct interface, including:

- message text
- sender names or usernames
- visible timestamps
- reply context
- media labels
- shared-post information or captions when visible

### How the data is used

This information is used solely to generate the transcript requested by the
user.

### Local processing

DM2Text processes conversation content locally in the user's browser.

DM2Text does not transmit conversation content to the developer or to external
servers.

DM2Text does not initiate network requests for the purpose of collecting,
storing, analyzing, or transmitting user conversation data.

### Storage and retention

Conversation data is not persistently stored by DM2Text.

The data exists temporarily in page memory while a copy session is active and
is discarded after the operation completes.

The requested transcript is written to the user's operating-system clipboard.
Clipboard contents may remain available to the operating system and other
applications until they are replaced or cleared by the user.

### Data sharing

DM2Text does not sell, rent, share, or transfer user data to third parties.

### Analytics and tracking

DM2Text does not use analytics, advertising trackers, telemetry, or behavioral
profiling.

### Authentication

DM2Text does not collect or access Instagram passwords, authentication
credentials, or authentication tokens.

### Permissions

DM2Text requests access to Instagram pages only so it can identify and process
the conversation content required for its Copy context feature.

The clipboardWrite permission is used solely to place the transcript requested
by the user onto the clipboard.

### Limited Use

DM2Text's use of user data complies with the Chrome Web Store User Data Policy,
including the Limited Use requirements. User data is used only to provide
DM2Text's disclosed single purpose.

### Changes

If DM2Text's data-handling practices change, this privacy policy will be updated
before those changes are released.

### Contact

For privacy questions or issues:

<https://github.com/postigodev/dm2text/issues>

Source code:

<https://github.com/postigodev/dm2text>

Both URLs must render as clickable links.

## Responsive behavior

- Desktop uses the approved asymmetrical hero and three-column steps.
- Tablet reduces the hero gap and mockup scale while preserving the split until
  the content would become cramped.
- Mobile stacks hero copy before the mockup, changes steps and privacy facts to
  one column when necessary, and lets CTA groups wrap without horizontal
  overflow.
- The product illustration preserves readable dialog labels and never crops the
  selected-message endpoint concept.
- Content remains usable at 320px without horizontal page scrolling.

## Accessibility

- Use semantic landmarks and heading order.
- Include one descriptive `h1` per route.
- Use real anchors for navigation and CTAs.
- Provide visible `:focus-visible` states and comfortable touch targets.
- Meet WCAG AA contrast for body text, controls, and focus indicators.
- Treat decorative glows and mockup details as hidden from assistive
  technology; give the overall product visual concise descriptive alternative
  text or an accessible labelled figure.
- Respect `prefers-reduced-motion` and avoid essential information conveyed only
  by motion or color.
- The illustrative dialog uses non-interactive elements so keyboard users are
  not led into a dead control.

## SEO and metadata

Astro's `site` value is `https://dm2text.postigo.sh`. `BaseLayout.astro`
generates route-specific title, description, canonical URL, Open Graph title,
Open Graph description, Open Graph URL, theme color, and favicon metadata.

Homepage metadata:

- title: **DM2Text — Copy Instagram DMs as structured text**;
- description: **Copy clean, structured context from Instagram Direct without
  sending your conversations anywhere. Local-first and open source.**

The privacy page receives a specific title and description rather than reusing
the homepage title. No sitemap integration, social-image generator, structured
data package, or external font request is required for this two-page launch.

## Data flow and failure behavior

All visible content and links are compiled into static HTML. The authored site
collects no user data and has no application-level data flow. It includes no
forms, cookies, analytics, trackers, application storage, or client-side data
submission. Ordinary HTTP request metadata may still be processed by the
hosting provider as part of serving the static site.

The primary CTA reads one build-time constant. Until the Chrome Web Store URL
is available, that constant intentionally points to the latest GitHub release.
External links use safe `rel` attributes when opening a new tab. Broken public
URLs are treated as release-time configuration errors and are checked during
review rather than hidden behind client-side retries.

Because the site has no forms, network calls, or client application state,
there are no loading, empty, or runtime error states to design. Unknown routes
receive the hosting platform's static 404 response; a custom 404 route is out of
scope.

## Formatting and verification

The website project includes Prettier with Astro support, `astro check`, and a
small Node script that inspects the static output. A `pnpm verify` command runs:

1. formatting verification;
2. Astro and TypeScript diagnostics;
3. the production build;
4. static-output verification.

Static-output verification confirms:

- `dist/index.html` exists;
- `dist/privacy/index.html` exists;
- both pages contain expected canonical metadata;
- production output does not contain Astro hydration directives or generated
  client JavaScript bundles;
- required local icon assets are present.

No unit-test framework or browser end-to-end suite is added for this static
two-route site. Manual review covers desktop, tablet, and mobile layouts,
keyboard focus, contrast, reduced motion, links, and final visual fidelity.

## Deployment

Vercel is configured through project settings rather than an adapter or
serverless configuration:

- Root Directory: `website`;
- Install Command: `pnpm install --frozen-lockfile`;
- Build Command: `pnpm build`;
- Output Directory: `dist`;
- production domain: `dm2text.postigo.sh`.

Astro remains in its default static-output mode. The project does not require
secrets, environment variables, a Vercel adapter, server functions, analytics,
or external services.

## Acceptance criteria

- Only `/` and `/privacy` are authored application routes.
- The landing page matches the approved Editorial product spotlight direction.
- All required copy, privacy facts, transcript formatting, legal attribution,
  and independence disclaimer are present.
- The privacy policy reproduces the complete owner-approved text verbatim,
  including its headings and clickable links.
- The existing DM2Text mark is reused without redesign.
- The site remains static and contains no hydration or external data requests.
- The website is responsive and accessible across the required viewport sizes.
- `pnpm verify` succeeds from `website/`.
- The extension implementation and root build configuration remain unchanged.
- The website README documents local development, verification, static build,
  Vercel settings, and the exact Chrome Web Store URL replacement location.
