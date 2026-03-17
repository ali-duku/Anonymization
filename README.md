# Anonymizer

Anonymizer is a browser-based, PDF-first tool designed for GitHub Pages deployment.

## Release Discipline

Every functional/UI update must include both:

- A new top entry in `src/appMeta.ts` under `releaseNotes`.
- Documentation updates (`README.md`, `docs/ARCHITECTURE.md`, and `docs/MAINTENANCE.md`) when behavior, structure, or process changes.

## Latest Update

- **v0.5.0 (2026-03-17)**
  - Viewer now loads PDFs by secure document ID via a repository layer (mocked locally), instead of using local file upload and IndexedDB persistence.
  - The app no longer auto-restores the last-uploaded PDF; startup always prompts for a document ID and does not store PDF content in the browser between sessions.
  - This aligns the tool with a server-backed model where PDFs live in a secure database or object store and are fetched on demand.

- **v0.4.22 (2026-03-17)**
  - Added Viewer `Add BBox` drag-to-draw creation for loaded overlay sessions (same bbox validation rules as move/resize edits).
  - Newly created bboxes now behave like existing regions and are included in generated JSON output (`layout_detection` + `content_extraction`).
  - Extended overlay source provenance for user-added regions using nullable snapshot source refs to keep generation canonical and scalable.

- **v0.4.21 (2026-03-17)**
  - Expanded `ANONYMIZATION_ENTITY_LABELS` into a canonical alphabetical shared catalog that includes all entities found in `results_20260312_150534_anonymised.json`.
  - Matched region-dialog text-input and preview title/box spacing and dimensions so both columns render identically.
  - Updated top-header `Generate JSON` to the same primary style as `What's New`, and pinned Setup bottom controls into split left/right one-line status lanes.

- **v0.4.20 (2026-03-17)**
  - Unified entity canonicalization into one shared module used by Viewer and annotation parse/generate services.
  - Hardened span-editor/picker state writes and stale-span render guards to eliminate remaining blank-screen edit paths.
  - Added regression coverage for span-entity edits and malformed/non-canonical payload coercion.

## Core Features

- Dark-mode-only interface.
- Compact top header that includes app identity, tab toggle, version, and `What's New`.
- Main `Viewer` tab for a single PDF workflow.
- PDFs are loaded by secure document ID via a backend/DB lookup (no local browser persistence of PDF files).
- Separate `Setup` tab for JSON:
  - Paste input JSON.
  - Validate and regenerate as pretty-printed JSON (lossless data, one key per line).
  - View generated JSON output.
  - Copy generated output to clipboard.
  - Load overlays into Viewer directly from `Input JSON` using `Load to Viewer`.
  - Setup bottom actions are pinned and split into two one-line lanes:
    - left: `Load to Viewer` + load status text.
    - right: `Copy Output` + generated output line count.
  - If current overlays include viewer edits, `Load to Viewer` asks for confirmation before replacing them.
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
  - Supports adding new bboxes directly in Viewer via `Add BBox` drag-to-draw (loaded overlay sessions only).
  - Enforces normalized bounds, minimum logical size (`10px` converted to normalized dimensions), and strict ordering (`x1 < x2`, `y1 < y2`).
  - Auto-saves bbox geometry edits only when geometry changes, and shows `Saving...` / `Saved` status in the Viewer toolbar.
  - Region dialog supports editable text, fixed-label dropdown selection, Save, and Reset.
  - Region dialog supports text anonymization spans:
    - select a continuous text range,
    - click `Anonymize`,
    - choose a developer-managed entity label from the dialog picker.
  - Region text is edited in a standard textarea; highlighted entities render in a synchronized read-only preview.
  - Text input and preview are rendered side-by-side in the region dialog with matched title spacing and identical surface sizing.
  - Highlighted anonymized spans are color-coded by entity label.
  - Double-clicking a highlighted span opens an anchored popover editor at that text location (change entity or remove only; no manual start/end editing).
  - Invalid or unsupported entity labels are coerced safely to `آخر` instead of breaking rendering.
  - Viewer/session/output entity canonicalization now shares one utility path to avoid divergence between editing and generation.
  - Canonical entity labels are maintained alphabetically in `src/shared/anonymizationEntities.ts`.
  - Selecting text alone does not open entity controls until `Anonymize` is clicked.
  - After clicking `Anonymize`, the entity picker opens directly under the anonymize controls.
  - Overlapping anonymization spans are blocked.
  - Text edits remap span indices deterministically (spans before edit unchanged, spans after edit shifted; irreconcilable overlaps dropped with warning).
  - Region dialog `Delete` action prompts before removal and permanently removes that region from overlay edits when confirmed.
  - Region dialog text input defaults to RTL and includes a toggle button for LTR/RTL direction switching.
  - Dialog opens from Edit button or bbox double-click.
  - Esc / top-right red `X` / Cancel close the dialog and prompt if there are unsaved edits.
  - Deleted regions are omitted from generated OCR JSON output (`layout_detection` + matched `content_extraction`).
  - Generated OCR JSON writes `entities` arrays on `content_extraction` regions (patched matched entries and appended unmatched entries, `[]` when none).
  - Newly added bboxes are appended to generated OCR JSON output in both `layout_detection` and `content_extraction`.
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
- `src/services`: JSON, annotation, and PDF repository services.
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



