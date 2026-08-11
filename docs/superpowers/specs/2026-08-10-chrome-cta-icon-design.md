# Chrome CTA Icon Design

## Goal

Replace the generic download icon in every website "Add to Chrome" CTA with the recognizable multicolor Google Chrome logo.

## Design

- Keep the CTA text, gradient, dimensions, spacing, hover behavior, destination, and manual-install disclosure unchanged.
- Add a local SVG asset containing the Chrome brand mark and render it at 18 by 18 pixels where the Lucide download icon currently appears.
- Keep the asset inside `website/public/brand/` so the static site makes no third-party asset requests and adds no runtime dependency.
- Treat the SVG as decorative because the adjacent "Add to Chrome" text provides the accessible name.

## Validation

- Assert that the built landing page references the local Chrome logo.
- Run `pnpm verify` from `website/` to check formatting, types, static build output, content assertions, and the zero-client-JavaScript constraint.
