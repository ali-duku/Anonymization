# Maintenance Guide

## Versioning

- Use semantic versioning (`MAJOR.MINOR.PATCH`).
- Update version in:
  - `package.json`
  - `src/appMeta.ts` (`APP_META.version`)

## Current Baseline

- Latest shipped version: `0.6.3`.
- Latest viewer baseline includes:
  - viewport-aware region editor scrolling,
  - draggable outer region-dialog separator with keyboard resize support,
  - widened region-dialog separator resize envelope (further-left drag allowed),
  - per-tab session persistence for outer dialog pane width,
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

## Release Checklist

1. Update `package.json` version.
2. Update `APP_META.version` and prepend a `releaseNotes` entry.
3. Update docs per Definition of Done.
4. Run `npm run build`.
