# Anonymizer

Anonymizer is a browser-based, PDF-first tool designed for GitHub Pages deployment.

## Release Discipline

Every functional/UI update must include both:

- A new top entry in `src/appMeta.ts` under `releaseNotes`.
- Documentation updates (`README.md`, `docs/ARCHITECTURE.md`, and `docs/MAINTENANCE.md`) when behavior, structure, or process changes.

## Latest Update

- **v0.4.11 (2026-03-16)**
  - Added a manual `Save` button in the top header bar for active overlay sessions.
  - Undo/Redo now auto-save restored overlay state and no longer remain stuck in `Saving...`.

## Core Features

- Dark-mode-only interface.
- Compact top header that includes app identity, tab toggle, version, and `What's New`.
- Main `Viewer` tab for a single PDF workflow.
- Last uploaded PDF is saved in IndexedDB and auto-restored on future visits.
- Separate `Setup` tab for JSON:
  - Paste input JSON.
  - Validate and regenerate as pretty-printed JSON (lossless data, one key per line).
  - View generated JSON output.
  - Copy generated output to clipboard.
  - Load overlays into Viewer directly from `Input JSON` using `Load to Viewer`.
  - If overlays are loaded, editing `Input JSON` asks for confirmation and clears active overlay edits on confirm.
  - When overlays are loaded, `Generate JSON` outputs OCR JSON with edited bbox/label/text patched in-place (input textarea remains unchanged).
  - Generate also creates `content_extraction` entries for unmatched edited regions so text edits are preserved in output.
  - Uses optimized no-wrap textarea handling for smoother large-payload paste and tab switch performance.
- Viewer overlay behavior:
  - Draws all regions from `pipeline_steps.layout_detection` on the active PDF page.
  - Matches layout regions to `pipeline_steps.content_extraction` by bbox (exact + tolerance fallback).
  - Uses 0-index metadata page fallback (`page_number`) when source metadata is missing.
  - Uses bbox/source-order fallback `region_id` (global 1-based sequence from flattened `content_extraction`) when missing.
  - Uses translucent, label-based color coding with high-visibility per-region edit controls.
  - Supports dragging whole bboxes and resizing from `NW/NE/SW/SE` corners.
  - Enforces normalized bounds, minimum logical size (`10px` converted to normalized dimensions), and strict ordering (`x1 < x2`, `y1 < y2`).
  - Auto-saves bbox geometry edits only when geometry changes, and shows `Saving...` / `Saved` status in the Viewer toolbar.
  - Region dialog supports editable text, fixed-label dropdown selection, Save, and Reset.
  - Region dialog text input defaults to RTL and includes a toggle button for LTR/RTL direction switching.
  - Dialog opens from Edit button or bbox double-click.
  - Esc / top-right red `X` / Cancel close the dialog and prompt if there are unsaved edits.
  - App-level `Save` / Undo / Redo controls are available in the top header bar.
  - Undo scope: overlay edits + Setup overlay-session `Load to Viewer`/clear transitions.
  - Undo/redo transitions auto-save the restored session state and mark it as `Saved`.
  - Setup Generate/Copy status and textbox typing are not app-history tracked.
  - Keeps Viewer controls on one horizontal line beside the `Viewer` title.
- Header includes version and a `What's New` modal that uses the same red `X` close control as the region editor dialog.

## Stack

- React 18
- TypeScript
- Vite
- PDF.js (`pdfjs-dist`)
- Vitest + Testing Library

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

4. Run tests:

```bash
npm run test:run
```

5. Build production files:

```bash
npm run build
```

## GitHub Pages Deployment

This project uses `base: "./"` in Vite config, so build output is portable.

1. Run:

```bash
npm run build
```

2. Publish the generated `dist/` folder to your GitHub Pages branch (or use a Pages deploy action).
3. GitHub Pages serves `dist/index.html` as the app entry.

## Project Structure

- `src/viewer`: PDF viewer UI and workflow.
- `src/setup`: JSON setup workflow.
- `src/services`: IndexedDB and JSON services.
- `src/shared`: reusable app shell components.
- `src/types`: shared interfaces and contracts.
- `docs/ARCHITECTURE.md`: module boundaries and data flow.
- `docs/MAINTENANCE.md`: release/version workflow and extension guidance.

## Testing Scope

- JSON service:
  - Valid JSON formatting.
  - Invalid JSON error details.
- Storage service:
  - Empty DB behavior.
  - Save/restore PDF.
  - Save/restore viewer state.
- Components:
  - Header + What's New modal.
  - Tab switching and setup-state preservation.
  - Setup tab generate/copy/load behavior.
  - Viewer overlay rendering and edit dialog interactions.
