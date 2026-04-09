# Anonymizer

Anonymizer is a browser-based, PDF-first tool for OCR overlay review and anonymization edits.

## Release Discipline

Every functional/UI update must include both:

- A new top entry in `src/appMeta.ts` under `releaseNotes`.
- Documentation updates (`README.md`, `docs/ARCHITECTURE.md`, and `docs/MAINTENANCE.md`) when behavior, structure, or process changes.

## Latest Update

- **v0.8.1 (2026-04-09)**
  - Added dialog-scoped keyboard region navigation in Edit Region: `ArrowLeft`/`ArrowRight` now map to `Previous`/`Next`, and `Ctrl+ArrowLeft`/`Ctrl+ArrowRight` map to `First`/`Last`.
  - Routed keyboard region switching through the same canonical current-page navigation handlers used by Region Context buttons.
  - Added strict shortcut gating so region-navigation keys do not fire while editing text controls or while span/entity popovers are open.

- **v0.8.0 (2026-04-09)**
  - Added canonical anonymized-span boundary resizing in Edit Region with both inline Preview start/end handles and span-popover start/end controls.
  - Integrated span-boundary resizing into canonical overlay history/save flows with deterministic clamping and undo/redo coherence.
  - Fixed Preview text-metric parity so highlighted spans/handles are layout-neutral and no longer alter text size, spacing, wrapping, or line breaks.

- **v0.7.8 (2026-04-08)**
  - Fixed canonical entity-color separation by replacing formula-based hue stepping with a deterministic prefix-spread hue-slot order that maximizes early visual distance.
  - Resolved real-world similarity collisions in the HMC catalog (including `Qatar ID` vs `HC Number`) without introducing label-specific one-off overrides.
  - Preserved identity-key stability guarantees so the same canonical entity key keeps the same color across reloads, reopenings, and sessions.

- **v0.7.7 (2026-04-08)**
  - Replaced transient-order-dependent anonymized-entity coloring with a canonical identity-key map so the same entity key keeps the same color across reloads and sessions.
  - Improved anonymized span legibility on dark surfaces with stronger border/background treatment and stable high-contrast text color.
  - Centralized anonymized entity color generation in one shared module with deterministic spaced allocation to keep behavior maintainable and visually coherent.

- **v0.7.6 (2026-04-08)**
  - Expanded Edit Region page-local bbox navigation with new `First` and `Last` controls in the existing Region Context navigation row.
  - Added direct editable region-order navigation (`current / total`) so users can type a target region number and jump deterministically within the current page.
  - Unified first/last/previous/next/direct-jump behavior on one canonical page-region navigation path with shared unsaved-change guard and boundary handling.

- **v0.7.5 (2026-04-07)**
  - Refactored Region Editor into dedicated snippet/form sections plus focused hooks for dialog lifecycle, document mutations, anonymization, and span editing.
  - Strengthened PDF/session continuity with manual PDF content-hash identity support and hardened per-PDF overlay session persistence/restore handling.
  - Added deterministic safety behavior: close/refresh warnings for unsaved-or-not-generated work, explicit Restore/Skip prompt for matching saved PDF edits, dialog-context undo/redo support, and hover-driven bbox controls/anchors with brief persistence.

- **v0.7.4 (2026-03-25)**
  - Extended the global top-header `BBox structure` toggle so OFF now also blocks raw text/content editing and text-only copy actions.
  - Kept anonymization management enabled while OFF: users can still add/edit/delete anonymized spans over existing text.
  - Enforced this in both UI affordances and underlying handlers/save paths.

- **v0.7.3 (2026-03-25)**
  - Changed default PDF zoom after load to `150%`.
  - Removed automatic fit-to-width on initial PDF load so the default zoom is applied consistently.
  - Changed Region Context snippet default/reset zoom in Edit Region to `75%`.

- **v0.7.2 (2026-03-25)**
  - Added a global top-header `BBox structure` toggle as the canonical source of truth for structural bbox editing capability.
  - Toggle OFF now blocks structural bbox operations everywhere they are exposed: move/resize, add, delete, full-bbox copy, and bbox paste.
  - Enforced the gate in both UI affordances and underlying handlers so disabled structural actions cannot be executed accidentally.

- **v0.7.1 (2026-03-25)**
  - Added top-header global controls for entity profile selection and default text direction (`RTL`/`LTR`), with persistent restore across reloads.
  - Replaced the single fixed entity catalog with canonical profile-based catalogs and friendly UI profile names, while keeping stable internal profile IDs.
  - Wired active profile entity labels across anonymization pickers/editors and made region editor sessions start from the global default direction (local in-dialog toggle remains available).

- **v0.7.0 (2026-03-25)**
  - Added compact inline bbox label editing directly on the outer viewer overlay beside existing bbox action icons.
  - Inline label changes now use the canonical region edit/save flow and shared label catalog (no parallel label path).
  - Preserved existing overlay controls, dialog editing flow, color-coding behavior, and generated JSON/save behavior.

- **v0.6.12 (2026-03-25)**
  - Updated Edit Region `Save` to auto-advance to the next bbox on the same page after a successful save, using the same canonical flow as `Next`.
  - Preserved save safety: no auto-navigation on failed/invalid save, and no navigation when there is no next bbox.
  - Fixed region dialog split constraints so the right pane no longer shrinks below action-button usability while the left pane can shrink further.

- **v0.6.11 (2026-03-25)**
  - Removed explicit span confirmation buttons: `Save` is removed from edit-span and `Apply` is removed from new anonymized-span.
  - Updated span entity selection to auto-apply immediately in both span flows.
  - Improved nested dialog dismissal behavior: `Escape` and outside-click now dismiss the active (topmost) span dialog first.
  - Preserved parent region dialog continuity when dismissing a span dialog.

- **v0.6.10 (2026-03-24)**
  - Fixed bbox render-basis drift by keeping PDF canvas and overlay stage on the same pixel dimensions (no responsive stage/canvas max-width clamping).
  - Centralized bbox projection helpers so overlay placement and canvas snippet crops use one canonical normalized-bbox conversion path.
  - Enforced normalized bbox input contract (`x1/y1/x2/y2` in `[0..1]`) during parse with explicit error messaging for invalid upstream data.

- **v0.6.9 (2026-03-24)**
  - Added `Paste BBox` in the Edit Region dialog to apply copied bbox payload into the currently edited bbox draft (in-place update, no new bbox creation).
  - Reused the same canonical full-bbox clipboard payload mapping for both toolbar paste (new bbox) and dialog paste (current bbox overwrite).
  - Preserved existing save flow: pasted dialog changes persist through the standard `Save` path.

- **v0.6.8 (2026-03-24)**
  - Updated toolbar labels/icons: `Fit Width` is now `Fit`, and page navigation uses arrow controls.
  - Added full bbox copy from overlay and region dialog, plus toolbar paste beside `Add BBox`.
  - Added separate text-only copy actions from overlay and region dialog.

- **v0.6.7 (2026-03-24)**
  - Updated on-bbox controls to compact translucent icon buttons (pen edit + trash delete).
  - Added direct delete action on each bbox overlay using the same canonical delete behavior as the region dialog.
  - Preserved existing overlay edit/delete interaction flow while reducing on-canvas visual footprint.

## Core Features

- Dark-mode interface with compact app shell.
- Main `Viewer` tab for PDF rendering, overlay interaction, and region editing.
- `Setup` tab for JSON input, generation, copy, and loading overlays into Viewer.
- Viewer supports:
  - Secure retrieval by ID through simulated backend contract (`api/getfile?id=<id>`).
  - Optional manual local PDF upload bypass from the same toolbar/empty state.
  - Deterministic per-PDF overlay restore behavior with explicit Restore/Skip prompt when matching saved edits exist.
  - Page navigation, zoom, and fit.
  - Overlay drag/resize/create.
  - On-canvas bbox action controls and resize anchors are hidden by default, appear on hover, and persist briefly after hover-out for stable interactions.
  - Toolbar paste action beside `Add BBox` to create a new bbox from copied bbox payload on the current page.
  - Global top-header `BBox structure` toggle as the canonical capability gate:
    - OFF blocks structural bbox editing (move/resize/add/delete/full-copy/paste), raw text editing, and text-only copy actions.
    - OFF still allows anonymization operations over existing text (add/edit/delete anonymized spans/entities).
  - Region dialog editing (label/text/entities), span anonymization, and delete.
  - Existing anonymized spans can be resized from both boundaries via inline Preview handles and span-popover start/end controls, using canonical character-offset updates with deterministic clamping.
  - Preview highlighting and boundary handles are layout-neutral so Preview text keeps the same font metrics, spacing, wrapping, and line breaks as source Text.
  - Span dialogs use immediate entity auto-apply (no explicit `Save`/`Apply` buttons).
  - Span dialogs dismiss topmost-first on `Escape` or outside-click while keeping the parent region dialog open.
  - Region dialog full bbox copy, in-place `Paste BBox` into the currently edited bbox draft, and separate text-only copy actions.
  - Searchable entity-label dropdown for both new anonymization spans and span-editor updates.
  - Canonical identity-key anonymized-entity color assignment so the same entity key always resolves to the same color independent of runtime order/session timing.
  - Draggable outer dialog pane separator with session-scoped width persistence and container-bound split clamp enforcement.
  - Fenced HTML table preview rendering in region dialog Preview (table-only).
  - Current-page bbox navigation while editing (`First`, `Previous`, direct region-number jump, `Next`, `Last`) with visible `current/total` context.
  - Dialog-scoped keyboard region navigation mirrors Region Context buttons: `ArrowLeft`/`ArrowRight` for `Previous`/`Next`, `Ctrl+ArrowLeft`/`Ctrl+ArrowRight` for `First`/`Last` (blocked while typing or while span/entity popovers are open).
  - Region snippet zoom controls with right-click/drag-save prevention (default/reset at 75%).
  - Optional bbox diagnostics logs in development via `VITE_VIEWER_BBOX_DEBUG=1`.
- Setup supports:
  - Uncontrolled input/output textareas for large JSON payloads.
  - Pretty-printed generation output.
  - Copy-to-clipboard.
  - Load-to-Viewer with confirmation guards.
- App-level Save / Undo / Redo with keyboard shortcuts, including region-dialog non-text contexts.
- Browser close/refresh warning when overlay work is unsaved or not yet generated.
- App-level display settings with persistent global font-size control, active entity profile selection, default text direction, and bbox structural editing capability toggle.

## Stack

- React 18
- TypeScript
- Vite
- PDF.js (`pdfjs-dist`)

## Local Development

1. Install Node.js 20+.
2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

4. Build production files:

```bash
npm run build
```

## GitHub Pages Deployment

This project uses `base: "./"` in Vite config, so build output is portable.

1. Run:

```bash
npm run build
```

2. Publish the generated `dist/` folder to your GitHub Pages branch.

## Project Structure

- `src/pages/AppPage`: app shell orchestration.
- `src/components/general`: reusable shell UI (`Header`, `TabNav`, `WhatsNewModal`).
- `src/features/setup`: Setup domain components/hooks/utils.
- `src/features/viewer`: Viewer domain components/hooks/utils/constants.
- `src/features/pdf`: retrieval-first PDF workspace plus session-only manual upload bypass, with source orchestration and backend-driven services.
- `src/constants`: shared static catalogs and label constants.
- `src/services`: shared API/domain services (`annotation`, `json`).
- `src/types`: shared contracts.
- `src/utils`: shared pure utilities.
- `docs/ARCHITECTURE.md`: module boundaries and data flow.
- `docs/MAINTENANCE.md`: release/version workflow and extension guidance.
