# DM2Text website

Static Astro marketing website for [DM2Text](https://github.com/postigodev/dm2text).

## Local development

From `website/`:

```powershell
pnpm install
pnpm dev
```

Astro prints the local URL. The authored routes are `/` and `/privacy/`.

## Verification and build

```powershell
pnpm verify
```

This checks formatting and Astro/TypeScript diagnostics, creates the static build, tests the generated routes and content, and verifies that the artifact contains no client JavaScript bundles.

The production files are written to `website/dist/`.

## Chrome Web Store URL

`src/config.ts` exports `CHROME_WEB_STORE_URL` with the public DM2Text listing. Every install CTA reads that shared value, and `IS_MANUAL_INSTALL` keeps the manual-install disclosure hidden while the store URL is active.

## Vercel

Configure the Vercel project with:

- Root Directory: `website`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: `dist`
- Domain: `dm2text.postigo.sh`

Astro uses static output and requires no adapter, serverless function, secret, analytics integration, or environment variable.
