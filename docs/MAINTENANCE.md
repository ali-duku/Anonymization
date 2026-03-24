# Maintenance Guide

## Versioning

- Use semantic versioning (`MAJOR.MINOR.PATCH`).
- Update version in:
  - `package.json`
  - `src/appMeta.ts` (`APP_META.version`)

## Current Baseline

- Latest shipped version: `0.6.10`.
- Latest viewer baseline includes:
  - viewport-aware region editor scrolling,
  - draggable outer region-dialog separator with keyboard resize support,
  - widened region-dialog separator resize envelope (further-left drag allowed),
  - per-tab session persistence for outer dialog pane width,
  - searchable entity dropdown field for anonymization entity selection (entity picker + span editor),
  - empty-default anonymization entity input after pressing `Anonymize`, requiring a valid catalog label before apply,
  - app-level persistent display settings with global top-header font-size control (Small/Medium/Large),
  - compact translucent on-canvas bbox icon controls (pen edit + trash delete),
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
  - viewport-anchored span editor popover.

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

