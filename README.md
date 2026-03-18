# Anonymizer

Anonymizer is a browser-based, PDF-first tool for OCR overlay review and anonymization edits.

## Release Discipline

Every functional/UI update must include both:

- A new top entry in `src/appMeta.ts` under `releaseNotes`.
- Documentation updates (`README.md`, `docs/ARCHITECTURE.md`, and `docs/MAINTENANCE.md`) when behavior, structure, or process changes.

## Latest Update

- **v0.5.0 (2026-03-18)**
  - Refactored the frontend to a feature-first architecture with strict per-component foldering (`tsx` + `.types.ts` + `.module.css`).
  - Split the Viewer and Setup domains into focused subcomponents/hooks/utilities while preserving behavior.
  - Modularized annotation parse/generate internals into dedicated parsing, matching, patching, and JSON error helper modules.

## Core Features

- Dark-mode interface with compact app shell.
- Main `Viewer` tab for PDF rendering, overlay interaction, and region editing.
- `Setup` tab for JSON input, generation, copy, and loading overlays into Viewer.
- Viewer supports:
  - PDF upload/replace and session restore.
  - Page navigation, zoom, and fit-width.
  - Overlay drag/resize/create.
  - Region dialog editing (label/text/entities), span anonymization, and delete.
- Setup supports:
  - Uncontrolled input/output textareas for large JSON payloads.
  - Pretty-printed generation output.
  - Copy-to-clipboard.
  - Load-to-Viewer with confirmation guards.
- App-level Save / Undo / Redo with keyboard shortcuts.

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
- `src/constants`: shared static catalogs and label constants.
- `src/services`: API/storage/domain services.
- `src/types`: shared contracts.
- `src/utils`: shared pure utilities.
- `docs/ARCHITECTURE.md`: module boundaries and data flow.
- `docs/MAINTENANCE.md`: release/version workflow and extension guidance.
