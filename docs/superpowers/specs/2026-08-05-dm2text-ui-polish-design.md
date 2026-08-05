# DM2Text UI Polish Design

**Date:** 2026-08-05  
**Status:** Approved for implementation planning

## Goal

Polish the existing copy-session dialog and toast so they feel native to
Instagram Direct, remain visually discreet, and communicate collection
progress more clearly. Preserve every validated MVP behavior and privacy,
performance, and bundle constraint.

## Intent

The user has just selected a message and wants to copy useful context with as
little interruption as possible. The interface should feel calm, compact, and
already at home inside Instagram Direct rather than like a branded third-party
application.

The selected direction is **Line of context**: a restrained progress line
connects the conversation history to the immutable selected-message anchor.
This is the sole signature element; the rest of the interface follows
Instagram's quiet control hierarchy.

## Scope

This pass may change only:

- dialog markup and owned styles in `src/ui/copy-dialog.ts`;
- toast markup and owned styles in `src/ui/toast.ts`;
- deterministic DOM tests for those components.

It must not change collection, parsing, anchor selection, transcript
formatting, clipboard behavior, network behavior, persistence, or session
lifecycle contracts. It adds no dependencies, assets, fonts, background work,
or permanent DOM.

## Visual System

### Structure and depth

- Keep a centered, compact dialog with a maximum width close to the current
  360 px footprint and safe 16 px viewport gutters.
- Add a very subtle fixed scrim owned by the dialog host. It separates the
  panel from the conversation without making Direct feel hidden.
- Use one depth strategy: quiet borders plus one soft panel shadow. Inputs are
  slightly inset through a small surface-color shift.
- Use a consistent radius scale: small controls, medium panel, pill only for
  compact status treatment where appropriate.

### Color and theme

- Adapt automatically with `prefers-color-scheme: dark` and a light default;
  do not inspect Instagram state or store a theme preference.
- Use a small token set inside each Shadow DOM: canvas/scrim, panel, inset
  control, primary/secondary/muted text, soft/emphasis border, Instagram-like
  blue action, and desaturated success/warning/error semantics.
- Color communicates action or status only. No decorative gradients or extra
  accent colors are part of the production design.

### Typography and spacing

- Use the platform system font stack to remain visually compatible with
  Instagram and avoid font downloads.
- Establish clear title, body, label, metadata, and numeric-progress levels
  through weight and color as well as size.
- Use a 4 px spacing base. Component padding and gaps remain multiples of that
  base.

## Dialog States

The same host and panel remain mounted throughout the session; state changes
replace only the panel contents.

### Count entry

- Header: `Copy context` and the supporting line `Ends at the selected
  message`.
- Display a quiet anchor glyph as a structural cue, not a decorative logo.
- Label the number field `Messages to include`.
- Keep the existing integer range and inline validation behavior.
- `Copy` is the blue primary action; `Cancel` is a lower-emphasis text action.

### Collection progress

- Keep the same header and replace the form with the line-of-context progress
  treatment.
- Show determinate progress using `collected / requested`, clamped visually to
  0–100%, and a textual status such as `12 of 50 messages`.
- The line has a history endpoint and a selected-message anchor endpoint. The
  fill moves toward the anchor as collection progresses.
- Keep `Cancel` available and preserve Escape cancellation.

### Partial confirmation

- Keep the line visible at the achieved proportion.
- State `Found only X of Y messages` and retain the existing explicit question
  about copying the available messages.
- `Copy X` is primary and `Cancel` remains secondary. No clipboard write occurs
  before confirmation.

### Inline validation

- Reserve stable space beneath the field so invalid input does not cause a
  large panel jump.
- Use a subdued error color with `aria-live="polite"`; never rely on color
  alone.

## Toasts

- Keep toasts lazy, transient, clickable to dismiss, and positioned at the
  lower-right with safe viewport gutters.
- Use the dialog's typography, radius, border, and semantic token family.
- Prefer a dark/light neutral elevated surface with a restrained semantic
  indicator over filling the entire toast with saturated green, amber, or red.
- Preserve existing `status` versus `alert` roles and the four-second removal.

## Motion and Accessibility

- Use only brief opacity/translate transitions for panel and toast entry.
- Disable nonessential transitions under `prefers-reduced-motion: reduce`.
- Preserve initial focus on the count input, Escape cancellation, semantic
  dialog roles, status announcements, and keyboard-operable buttons.
- Add clearly visible `:focus-visible`, hover, active, and disabled states.
- Text and controls must meet WCAG AA contrast in both themes.

## Testing and Acceptance

Deterministic UI tests must continue to verify the existing lifecycle and add
assertions for stable, implementation-owned hooks rather than computed visual
pixels:

- count, progress, partial, and validation states expose their intended
  semantic structure;
- progress exposes the current and maximum values and clamps visual progress;
- the scrim and panel share the existing lazy host and are removed on close;
- Escape, Cancel, focus, `aria-live`, `status`, and `alert` behavior remain
  intact;
- no UI remains mounted after cleanup.

Manual acceptance checks cover the count, progress, partial, validation, and
toast states in Instagram Direct under both light and dark operating-system
themes, including a narrow viewport. The complete project must still pass
`pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm zip`, with total
JavaScript below 60 KB and the packaged extension below 200 KB.

## Non-goals

- No settings screen, popup, onboarding, localization, custom icons, custom
  fonts, sound, or new session behavior.
- No redesign of Instagram's native menu action.
- No attempt to read or duplicate Instagram's internal design tokens.
- No changes to the already-approved transcript output.
