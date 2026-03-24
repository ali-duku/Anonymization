# Anonymizer

Anonymizer is a browser-based, PDF-first tool for OCR overlay review and anonymization edits.

## Release Discipline

Every functional/UI update must include both:

- A new top entry in `src/appMeta.ts` under `releaseNotes`.
- Documentation updates (`README.md`, `docs/ARCHITECTURE.md`, and `docs/MAINTENANCE.md`) when behavior, structure, or process changes.

## Latest Update

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
  - Page navigation, zoom, and fit.
  - Overlay drag/resize/create.
  - On-canvas bbox action controls (icon-only edit/delete/full-copy/text-copy) with dialog-equivalent delete behavior.
  - Toolbar paste action beside `Add BBox` to create a new bbox from copied bbox payload on the current page.
  - Region dialog editing (label/text/entities), span anonymization, and delete.
  - Region dialog full bbox copy, in-place `Paste BBox` into the currently edited bbox draft, and separate text-only copy actions.
  - Searchable entity-label dropdown for both new anonymization spans and span-editor updates.
  - Draggable outer dialog pane separator with session-scoped width persistence.
  - Current-page bbox Previous/Next navigation while editing.
  - Region snippet zoom controls with right-click/drag-save prevention.
  - Optional bbox diagnostics logs in development via `VITE_VIEWER_BBOX_DEBUG=1`.
- Setup supports:
  - Uncontrolled input/output textareas for large JSON payloads.
  - Pretty-printed generation output.
  - Copy-to-clipboard.
  - Load-to-Viewer with confirmation guards.
- App-level Save / Undo / Redo with keyboard shortcuts.
- App-level display settings with persistent global font-size control.

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
- `src/features/pdf`: secure retrieval UI/hooks/services/utils for backend-driven PDF loading.
- `src/constants`: shared static catalogs and label constants.
- `src/services`: shared API/domain services (`annotation`, `json`).
- `src/types`: shared contracts.
- `src/utils`: shared pure utilities.
- `docs/ARCHITECTURE.md`: module boundaries and data flow.
- `docs/MAINTENANCE.md`: release/version workflow and extension guidance.
