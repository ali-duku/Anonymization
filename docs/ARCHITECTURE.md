# Architecture

## Goals

- Keep frontend modules small, explicit, and independently maintainable.
- Separate UI rendering, interaction state, and domain transformation logic.
- Preserve behavior while improving scalability and performance boundaries.

## Source Layout

- `src/pages/AppPage`: app-shell composition, tab orchestration, history ownership.
- `src/components/general`: shared shell components (`Header`, `TabNav`, `WhatsNewModal`).
- `src/features/setup`
  - `components`: Setup UI split into focused pieces.
  - `hooks/useSetupJsonWorkflow.ts`: Setup workflow state/actions.
  - `utils/setupText.ts`: pure text helpers.
- `src/features/viewer`
  - `components`: `PdfViewerTab` plus focused UI blocks (`ViewerToolbar`, `ViewerCanvasStage`, `OverlayLayer`, `OverlayBox`, `RegionEditorModal`, `EntityPicker`, `SpanEditorPopover`, `ViewerStatus`).
  - `hooks`: PDF lifecycle/persistence, overlay interactions, bbox creation, region editor state.
  - `utils`: pure geometry/status/text/document helpers.
  - `constants`: viewer interaction constants.
- `src/constants`: shared catalogs (`anonymizationEntities`, `regionLabelOptions`).
- `src/services`
  - `indexedDbStorageService.ts`
  - `jsonService.ts`
  - `annotationService.ts` (orchestrator)
  - `annotation/*` (parsing, matching, patching, shared helpers, json error parsing).
- `src/types`: contracts for app meta, history, JSON, overlay, PDF, and service APIs.
- `src/utils/history.ts`: generic undo/redo state engine.

## Component Contract

Each component lives in its own folder and includes:

1. `ComponentName.tsx`
2. `ComponentName.types.ts`
3. `ComponentName.module.css`

This pattern is applied consistently to general, setup, and viewer components.

## Data Flow

1. `AppPage` owns overlay session history (`past/present/future`) and global actions (Save/Undo/Redo/Generate trigger).
2. `SetupTab` parses input JSON and emits overlay load payloads into App session state.
3. `PdfViewerTab` consumes the active overlay session and emits document edits back to App.
4. `annotationService` transforms between OCR snapshot JSON and normalized overlay document model.
5. `jsonService` and `storageService` remain stable service boundaries.

## Performance Strategy

- Feature tabs (`SetupTab`, `PdfViewerTab`) are lazy-loaded with `React.lazy` + `Suspense`.
- `WhatsNewModal` is lazy-loaded.
- Setup uses uncontrolled textareas to reduce keystroke render overhead with large payloads.
- Viewer rendering logic is isolated in hooks (`usePdfDocument`, `useOverlayInteractions`, `useCreateBBox`, `useRegionEditor`) to localize updates.
- Stable leaf UI blocks are memoized.

## Persistence Model

- IndexedDB database: `anonymizer-db`.
- Object store: `app_state`.
- Keys:
  - `last-uploaded-pdf`
  - `viewer-state`

## Release Metadata Contract

- `src/appMeta.ts` is the source of truth for:
  - Current app version shown in Header.
  - `What's New` modal entries.
- Every shipped change must add a new top release note and keep versions aligned with `package.json`.
