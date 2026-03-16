# Architecture

## Goals

- Keep the app modular as functionality grows.
- Preserve a strong separation between UI, domain logic, and persistence.
- Keep everything client-side and GitHub Pages compatible.

## Subsystems

### App Shell

- `App.tsx` composes:
  - `Header` (name, embedded `TabNav`, version, What's New).
  - Top-header Save/undo/redo controls bound to App-owned overlay session actions.
  - `PdfViewerTab` and `SetupTab`.
  - In-memory overlay edit session state (loaded snapshot + editable overlays + save-state metadata) shared between Setup and Viewer.
  - App-level undo/redo history ownership for overlay session state (`past/present/future`) with bounded size and state dedupe.
  - Memoized overlay/session callbacks (`useCallback`) to reduce avoidable child rerenders.
  - Setup receives overlay-session payload only while the Setup tab is active to avoid hidden heavy-tab rerender cost during Viewer edits.
  - `What's New` modal close control reuses the same red Windows-style `X` button style used in Viewer region editing.
  - Global keyboard undo/redo orchestration (`Ctrl/Cmd+Z`, `Ctrl+Y`, `Ctrl/Cmd+Shift+Z`) with editable-target guards so native textbox undo/redo is not intercepted.
  - Undo/redo restores are immediately normalized to a saved overlay state (preventing stale `Saving...` states from history snapshots).

Layout behavior:

- The app shell is viewport-based (`100dvh`) and uses internal panel scrolling.
- The top header is pinned to the top edge and intentionally minimal.
- The `Viewer/Setup` tab toggle is embedded in the top header to minimize vertical chrome.
- Inactive tab panels are hidden natively to avoid hidden-panel layout side effects.
- Tabs stay mounted so state survives tab changes.

### Viewer Domain

- `PdfViewerTab` is responsible for:
  - Uploading a single PDF.
  - Rendering pages using PDF.js canvas rendering.
  - Compact single-line Viewer controls (upload/page/zoom/fit + inline metadata).
  - Auto-restore of last uploaded PDF.
  - Persisting page + zoom after changes.
  - Rendering per-page bbox overlays from parsed JSON annotation data.
  - Showing high-contrast overlay edit controls that remain visible at rest.
  - Pointer-driven bbox drag + `NW/NE/SW/SE` resize handles.
  - Geometry enforcement during interaction: page bounds, min logical size (`10px` converted to normalized values), no axis flip, strict `x1 < x2` and `y1 < y2`.
  - Region editor open via Edit button or bbox double-click.
  - Region dialog draft editing for label + text with Save/Reset semantics.
  - Region dialog text area defaults to RTL and offers an in-dialog LTR/RTL toggle button.
  - Dirty-change confirmation on close (Esc, top-right red Windows-style `X`, or Cancel).
  - Emitting overlay edit lifecycle callbacks to App shell (`onOverlayEditStarted`, `onOverlayDocumentSaved`) only when bbox geometry actually changes, preventing click-only autosave noise.
  - Viewer no longer owns Undo/Redo buttons; it only emits edit callbacks.
  - Showing save indicator state (`Saving...` / `Saved`) from App session metadata.
  - Fixed developer-maintained label catalog for dialog dropdown options.

### Setup Domain

- `SetupTab` handles:
  - Input JSON editor.
  - Uncontrolled textarea refs for high-volume JSON input/output to minimize keystroke/paste render cost.
  - Non-wrapping textarea behavior (`wrap=off`) with browser text helpers disabled for large-payload responsiveness.
  - Generate JSON action.
  - Output viewer and copy action.
  - `Load to Viewer` action that parses input JSON into overlay data and switches to Viewer on success.
  - Input-change confirmation when an overlay session exists; confirm clears active overlay edits/session.
  - Setup overlay-session transitions (`Load to Viewer` and clear-on-input-change confirmation) are undoable through App history.
  - Snapshot-based generate behavior: when a session exists, generate patches edited bbox values into loaded OCR snapshot in output only.
  - Native textarea undo/redo remains browser-managed and is not tracked in App history.
  - Pretty-printed JSON output serialization (`JSON.stringify(..., null, 2)`) so keys render on separate lines.
  - Stable status feedback region (success/error) with reserved height to avoid visual flicker.

### Services

- `IndexedDbStorageService`:
  - Persists latest PDF record and viewer state.
  - Supports replace/load/update/clear operations.
- `BrowserJsonService`:
  - Parses JSON input.
  - Returns pretty-printed output (2-space indentation) or actionable parse error metadata.
  - Clipboard copy abstraction.
- `BrowserAnnotationService`:
  - Validates OCR pipeline JSON shape for overlay loading.
  - Builds overlay regions from `layout_detection`.
  - Matches content from `content_extraction` by bbox (exact match, then tolerance fallback).
  - Applies metadata fallback rules from bbox/source matching:
    - `pageNumber` fallback uses 0-index source page.
    - `regionId` fallback uses global 1-based flattened `content_extraction` order.
  - Stores deterministic source pointers for each overlay region (layout pointer and optional matched-content pointer).
  - Supports snapshot patch generation that writes edited bbox + label values to `layout_detection`.
  - Patches matched `content_extraction` entries with edited bbox + `region_label` + `text` and normalized metadata (`page_number`, `region_id`).
  - Appends synthetic `content_extraction` entries for unmatched edited regions so text edits are represented in generated output.

## Data Contracts

- `AppMeta`, `ReleaseNote`: version and release notes.
- `StoredPdfRecord`: latest uploaded PDF metadata + blob + persisted view.
- `PdfViewerState`: runtime UI state for rendering and controls.
- `JsonGenerationResult`: normalized result for setup workflow.
- `OverlayDocument`, `OverlayRegion`: normalized overlay model for viewer rendering plus source mapping.
- `OverlayEditSession`: loaded OCR snapshot + editable overlay document + save-state metadata.
- `HistoryState`, `HistoryController`, `HistoryMeta`: generic undo/redo model used by App-shell state history.
- `StorageService`, `JsonService`, `AnnotationService`: stable interfaces for growth and testability.

## Persistence Model

- IndexedDB database: `anonymizer-db`.
- Object store: `app_state`.
- Keys:
  - `last-uploaded-pdf`
  - `viewer-state`

This enables startup restore without a server.

## Extension Points

- Add future JSON transformations by extending `JsonService` while keeping setup UI stable.
- Add new tabs by expanding `AppTab` in `TabNav` and composing new modules in `App`.
- Add additional PDF annotations in `viewer` without touching setup logic.

## Release Metadata Contract

- `src/appMeta.ts` is the source of truth for:
  - Current app version shown in Header.
  - `What's New` modal content.
- Every shipped change must add a new top release note entry and keep `APP_META.version` aligned with `package.json`.
