# Maintenance Guide

## Versioning

- Use semantic versioning (`MAJOR.MINOR.PATCH`).
- Update version in:
  - `package.json`
  - `src/appMeta.ts` (`APP_META.version`)

## Current Baseline

- Latest shipped version: `0.7.4`.
- Latest viewer baseline includes:
  - retrieval-by-ID as the primary PDF flow,
  - session-only manual upload bypass as secondary flow,
  - viewport-aware region editor scrolling,
  - draggable outer region-dialog separator with keyboard resize support,
  - per-tab session persistence for outer dialog pane width,
  - searchable entity dropdown field for anonymization entity selection (entity picker + span editor),
  - immediate entity auto-apply for both new anonymized-span and edit-span dialogs (no explicit span `Apply`/`Save` buttons),
  - topmost-first nested dialog dismissal for span dialogs (`Escape` and outside-click close the active span dialog first, keeping the parent region dialog open),
  - app-level persistent display settings with global top-header font-size control (Small/Medium/Large),
  - app-level persistent top-header entity-profile selector with canonical profile catalog wiring for anonymization entity options,
  - app-level persistent top-header default text-direction toggle (`RTL`/`LTR`) used as the region-editor session default while preserving local editor direction toggle behavior,
  - app-level persistent top-header structural bbox editing toggle (`BBox structure`) that canonically gates move/resize/add/delete/full-bbox copy/paste operations across toolbar, overlay controls, and region dialog handler paths,
  - extended capability semantics where `BBox structure` OFF also blocks raw text editing and text-only copy actions while still allowing anonymization add/edit/delete over existing text,
  - default PDF load zoom set to 150% (without implicit auto-fit on initial load),
  - region-context snippet zoom default/reset set to 75%,
  - compact translucent on-canvas bbox icon controls (pen edit + trash delete),
  - compact inline on-canvas bbox label selector beside existing overlay action icons (copy/text-copy/edit/delete),
  - on-canvas bbox full-copy and text-only copy controls,
  - toolbar bbox paste action beside `Add BBox`,
  - region-dialog `Paste BBox` action to apply copied full-bbox payload into the active region draft (in-place update),
  - canonical bbox projection helpers shared by overlay rendering and snippet crop conversion,
  - explicit normalized bbox input contract validation (`x1/y1/x2/y2` in `[0..1]`) during overlay parse,
  - identical page-stage/canvas pixel basis to prevent overlay drift under responsive container constraints,
  - toolbar `Fit` label and arrow-based page nav controls (`←`/`→`),
  - direct on-canvas delete routed through the same canonical delete behavior used by the region dialog,
  - snippet zoom + save-prevention UX controls,
  - current-page bbox previous/next navigation,
  - Save-in-dialog auto-advance to next bbox on successful save only, routed through canonical page-region next navigation logic,
  - region dialog split-pane sizing guardrails with one canonical runtime constraint solver (interaction clamp + grid/pane `min-width` enforcement), anchored to the dialog shell inner coordinate space so separator drag is always container-bounded while preserving intrinsic protected-row minima plus pane chrome with runtime remeasurement on resize/font/content changes (no compact/stacked fallback path and no protected-row `min-width` feedback-loop constraints),
  - region context snippet zoom that initializes/resets at 50% while preserving explicit zoom-driven scaling behavior,
  - viewport-anchored span editor popover,
  - fenced HTML table rendering in Region Editor Preview with raw-offset span projection.

## What's New Updates

Release notes are managed in `src/appMeta.ts`:

1. Add a new entry at the top of `releaseNotes`.
2. Keep highlights concise and user-facing.
3. Keep `APP_META.version` aligned with the latest release entry.
4. Keep `package.json` version aligned with `APP_META.version`.

## Mandatory Definition of Done

1. **What's New updated** in `src/appMeta.ts`.
2. **Docs updated** (`README.md`, `docs/ARCHITECTURE.md`, `docs/MAINTENANCE.md`) when relevant.
3. **Build passes** (`npm run build`).
4. **History behavior verified** if undoable transitions changed.

## Frontend Structure Rules

- Every component folder must include exactly:
  - `ComponentName.tsx`
  - `ComponentName.types.ts`
  - `ComponentName.module.css`
- Shared shell UI belongs in `src/components/general`.
- Feature UI stays in its domain (`src/features/setup`, `src/features/pdf`, `src/features/viewer`).
- Hooks go in feature `hooks/` unless truly cross-feature.
- Services contain orchestration/data-access only.
- Utilities remain pure and side-effect free.
- Constants hold static catalogs/config only.

## Service Boundaries

- Keep `AnnotationService`, `JsonService`, and `PdfRetrievalService` contracts stable in `src/types/services.ts`.
- `src/services/annotationService.ts` should remain an orchestrator.
- Parsing/matching/patching/error helper logic belongs in `src/services/annotation/*`.
- PDF retrieval transport and backend simulation logic stays in `src/features/pdf/services/*`.
- Manual upload bypass remains UI-level/session-level logic in `src/features/pdf/hooks/*` and must not introduce local persistence services.

## Build + Deploy Checklist

1. Run:

```bash
npm run build
```

2. Verify `dist/index.html` exists.
3. Publish `dist/` to GitHub Pages target branch.

## BBox Diagnostics

- To audit bbox/page geometry in development, run with `VITE_VIEWER_BBOX_DEBUG=1`.
- This enables concise console diagnostics for parse-time bbox range summary and stage/canvas basis mismatch detection.

## Release Checklist

1. Update `package.json` version.
2. Update `APP_META.version` and prepend a `releaseNotes` entry.
3. Update docs per Definition of Done.
4. Run `npm run build`.

