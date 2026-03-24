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
- `src/features/pdf`
  - `components`: secure retrieval workspace composition (`PdfWorkspaceTab`).
  - `hooks/usePdfRetrieval.ts`: request lifecycle state machine (validation, abort, stale-response guard, retry/reset).
  - `services`: endpoint adapter + simulated backend/bucket lookup.
  - `utils`: identifier validation and backend response/payload guards.
- `src/features/viewer`
  - `components`: `PdfViewerTab` plus focused UI blocks (`ViewerToolbar`, `ViewerCanvasStage`, `OverlayLayer`, `OverlayBox`, `RegionEditorModal`, `EntityPicker`, `SearchableEntityField`, `SpanEditorPopover`, `ViewerStatus`).
  - `hooks`: PDF rendering lifecycle, overlay interactions, bbox creation, region editor state, region-dialog layout splitter state/persistence (`useRegionDialogLayout`).
  - `utils`: pure geometry/status/text/document helpers.
  - `constants`: viewer interaction constants.
  - `RegionEditorModal` owns viewport-aware dialog UX, snippet zoom/protection controls, current-page previous/next bbox navigation wiring, and the outer-pane resize separator render integration (including shared width-clamp constants for drag/keyboard resize limits).
  - `SearchableEntityField` is the shared searchable dropdown input used by both `EntityPicker` and `SpanEditorPopover` for canonical entity-label selection.
  - `SpanEditorPopover` is viewport-positioned and anchored from preview-span geometry emitted by the dialog.
- `src/features/settings`
  - `hooks/useDisplaySettings.tsx`: app-level display settings context/provider, persistence, and global CSS-variable application.
  - `constants/displaySettings.ts`: storage keys/defaults/font-size scale mapping.
- `src/constants`: shared catalogs (`anonymizationEntities`, `regionLabelOptions`).
- `src/services`
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

This pattern is applied consistently to general, setup, pdf, and viewer components.

## Data Flow

1. `AppPage` owns overlay session history (`past/present/future`) and global actions (Save/Undo/Redo/Generate trigger).
2. `DisplaySettingsProvider` wraps the app and applies persistent global display settings (currently `fontSize`) to root CSS variables.
3. `SetupTab` parses input JSON and emits overlay load payloads into App session state.
4. `PdfWorkspaceTab` manages secure retrieval and passes retrieved documents into `PdfViewerTab`, which emits overlay edits back to App.
5. `annotationService` transforms between OCR snapshot JSON and normalized overlay document model.
6. `jsonService`, `annotationService`, and `pdfRetrievalService` remain stable service boundaries.

## Performance Strategy

- Feature tabs (`SetupTab`, `PdfWorkspaceTab`) are lazy-loaded with `React.lazy` + `Suspense`.
- `WhatsNewModal` is lazy-loaded.
- Setup uses uncontrolled textareas to reduce keystroke render overhead with large payloads.
- Viewer rendering logic is isolated in hooks (`usePdfDocument`, `useOverlayInteractions`, `useCreateBBox`, `useRegionEditor`) to localize updates.
- Stable leaf UI blocks are memoized.

## Retrieval Model

- Frontend retrieval contract: `GET api/getfile?id=<safe-id>`.
- ID input is sanitized/validated before request dispatch.
- Backend simulation resolves only allow-listed records in a mocked company bucket mapping.
- No local PDF persistence or startup auto-rehydration behavior.

## Release Metadata Contract

- `src/appMeta.ts` is the source of truth for:
  - Current app version shown in Header.
  - `What's New` modal entries.
- Every shipped change must add a new top release note and keep versions aligned with `package.json`.
