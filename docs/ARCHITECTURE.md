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
  - `components`: retrieval-first workspace composition (`PdfWorkspaceTab`) with source selection wiring.
  - `hooks/usePdfRetrieval.ts`: request lifecycle state machine (validation, abort, stale-response guard, retry/reset).
  - `hooks/useManualPdfBypass.ts`: session-only local upload bypass state/actions and PDF validation.
  - `services`: endpoint adapter + simulated backend/bucket lookup.
  - `utils`: identifier validation and backend response/payload guards.
- `src/features/viewer`
  - `components`: `PdfViewerTab` plus focused UI blocks (`ViewerToolbar`, `ViewerCanvasStage`, `OverlayLayer`, `OverlayBox`, `RegionEditorModal`, `EntityPicker`, `SearchableEntityField`, `SpanEditorPopover`, `ViewerStatus`).
  - `hooks`: PDF rendering lifecycle, overlay interactions, bbox creation, bbox clipboard copy/paste (`useBboxClipboard`), region editor state, region-dialog container bounds measurement (`useRegionDialogContainerBounds`), region-dialog layout splitter state/persistence (`useRegionDialogLayout`), region-dialog drag interaction (`useRegionDialogDrag`), region-dialog pane usability minimum measurement (`useRegionDialogPaneMinimums`), and canonical span-dialog handlers/dismissal coordination.
  - PDF load opens at a fixed default zoom (150%) instead of auto-fitting on first render; explicit `Fit` remains user-triggered from toolbar.
  - `usePageRegionNavigation` remains the canonical previous/next bbox navigation path; save-triggered next navigation is routed through this same hook to avoid duplicate navigation logic.
  - `utils`: pure geometry/status/text/document helpers.
  - `utils/bboxProjection.ts` is the canonical normalized-bbox projection module used for overlay CSS placement and pixel-space crops.
  - `utils/previewModel.ts` owns table-preview detection/projection (` ```html ` table-only), including raw-offset entity mapping and markup-overlap warnings.
  - `constants`: viewer interaction constants.
- `RegionEditorModal` owns viewport-aware dialog UX, snippet zoom/protection controls, current-page previous/next bbox navigation wiring, and outer-pane separator rendering for drag/keyboard resize.
- Region dialog split sizing is enforced by one canonical constraint solver shared by interaction and rendering contracts: measured pane minimums and dialog-shell inner width drive splitter clamp bounds, grid-track minimums, and pane `min-width` styles together.
- Pane minima are measured at runtime from the exact protected containers that the splitter must preserve: the left Region Context top header/control cluster and the right Edit Region bottom action row.
- Intrinsic max-content probing is used for protected-row width, pane chrome is added once to produce true pane minima, and the same minima are applied to splitter clamp bounds and rendered pane `min-width` styles.
- Measurement is runtime-reactive (open, resize, font-size effects, and protected-row content mutations) without drag-readiness gating; side-by-side split is always the active layout path and separator motion is clamped by measured left/right protected minima inside the live dialog-shell inner coordinate space.
  - Region context preview zoom is explicitly state-driven and initializes/resets to `75%` by default.
  - `usePdfDocument` is the rendering basis authority: PDF canvas intrinsic/CSS dimensions and overlay stage dimensions are kept identical so pointer normalization and overlay positioning share one coordinate frame.
  - `OverlayBox` owns direct on-canvas bbox actions (compact inline label selector plus translucent icon edit/delete/full-copy/text-copy controls), with label updates/delete routed through canonical region edit flows.
  - `ViewerToolbar` keeps canonical page/zoom/create controls and includes bbox paste beside `Add BBox`, using the shared bbox clipboard state in `PdfViewerTab` to create a new region.
  - One app-level capability flag (`BBox structure`) is the single source of truth for viewer edit permissions and must be enforced in both UI controls and handler paths.
  - When disabled, structural bbox operations (move/resize/add/delete/full-copy/paste), raw text editing, and text-only copy actions are blocked.
  - Anonymization operations over existing text (add/edit/remove spans/entities) remain enabled when this flag is disabled.
  - `RegionEditorModal` includes bbox full-copy, in-place paste into the active region draft, and text-only copy actions; dialog and toolbar paste reuse the same canonical clipboard payload mapping with different apply targets.
  - `SearchableEntityField` is the shared searchable dropdown input used by both `EntityPicker` and `SpanEditorPopover` for canonical entity-label selection.
  - `SpanEditorPopover` is viewport-positioned and anchored from preview-span geometry emitted by the dialog.
  - Span entity selection is immediate in both new/edit span flows (no explicit span `Save`/`Apply` buttons).
  - Nested dismissal is topmost-first: `Escape`/outside-click close the active span dialog before the parent region dialog.
- `src/features/settings`
  - `hooks/useDisplaySettings.tsx`: app-level display settings context/provider and persistence for font-size, active entity profile, default text direction, and structural bbox editing capability.
  - `constants/displaySettings.ts`: storage keys/defaults/font-size scale mapping.
- `src/constants`: shared catalogs (`anonymizationEntities`, `regionLabelOptions`).
  - `anonymizationEntities.ts` is the canonical entity-profile catalog (stable internal profile IDs, friendly display names, and per-profile entity labels).
- `src/services`
  - `jsonService.ts`
  - `annotationService.ts` (orchestrator)
  - `annotation/*` (parsing, matching, patching, shared helpers, json error parsing), including normalized bbox contract validation for overlay inputs.
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
2. `DisplaySettingsProvider` wraps the app and owns persistent global settings (`fontSize`, active entity profile, default text direction, structural bbox editing capability); `fontSize` is applied through root CSS variables and the other settings are consumed by Header controls + Viewer/editor capability guards (including derived raw-text edit and text-copy gating from the structural toggle).
3. `SetupTab` parses input JSON and emits overlay load payloads into App session state.
4. `PdfWorkspaceTab` manages retrieval + manual bypass sources and passes the active document into `PdfViewerTab`, which emits overlay edits back to App.
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
- Optional manual PDF upload bypass is available for session-only local loading.
- No local PDF persistence or startup auto-rehydration behavior for either source.

## Release Metadata Contract

- `src/appMeta.ts` is the source of truth for:
  - Current app version shown in Header.
  - `What's New` modal entries.
- Every shipped change must add a new top release note and keep versions aligned with `package.json`.
