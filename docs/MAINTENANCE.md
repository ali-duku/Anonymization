# Maintenance Guide

## Versioning

- Use semantic versioning (`MAJOR.MINOR.PATCH`).
- Update version in:
  - `package.json`
  - `src/appMeta.ts` (`APP_META.version`)

## What's New Updates

Release notes are managed in `src/appMeta.ts`:

1. Add a new entry at the top of `releaseNotes`.
2. Keep highlights concise and user-facing.
3. Ensure `APP_META.version` matches the latest release entry.
4. Ensure `package.json` version matches `APP_META.version`.

## Mandatory Definition of Done

For every merged change, all items below are required:

1. **What's New updated**:
   - New release note entry added in `src/appMeta.ts`.
2. **Docs updated**:
   - `README.md` updated if user-visible behavior changed.
   - `docs/ARCHITECTURE.md` updated if structure/layout/data flow changed.
   - `docs/MAINTENANCE.md` updated if release/process rules changed.
3. **Validation updated**:
   - Existing tests updated if behavior changed.
   - Build and tests pass locally.
4. **History behavior verified**:
   - If app-level undoable transitions changed, update history tests and keyboard guard coverage.

## Adding Features Safely

1. Add or update types in `src/types` first.
2. Extend service contracts (`StorageService` / `JsonService` / `AnnotationService`) when behavior changes.
3. Implement domain logic in `src/services`.
4. Keep UI modules (`src/viewer`, `src/setup`, `src/shared`) focused on presentation and user interaction.
5. Add tests for:
   - Service behavior.
   - UI behavior impacted by the change.
   - Overlay parsing + Setup-to-Viewer load flow whenever OCR JSON handling changes.

## Testing Workflow

Run:

```bash
npm run test:run
```

For local TDD:

```bash
npm run test
```

## Build + Deploy Checklist

1. Run tests.
2. Run production build:

```bash
npm run build
```

3. Verify `dist/index.html` exists.
4. Publish `dist/` to GitHub Pages target branch.

## Release Checklist (Required)

1. Update `package.json` version.
2. Update `APP_META.version` and prepend a `releaseNotes` entry.
3. Update docs per the Definition of Done section.
4. Run:

```bash
npm run test:run
npm run build
```

## Overlay JSON Notes

- `Load to Viewer` parses the Setup input JSON and does not depend on `Generate JSON` output.
- Viewer overlays are built from `pipeline_steps.layout_detection` and matched against `content_extraction` by bbox.
- All layout regions render; matched content regions are filled and expose text, unmatched regions remain geometry-only.
- Region dialog supports editable `label` (fixed catalog dropdown) and editable `text`.
- Region dialog text field defaults to RTL and must keep an explicit in-dialog toggle for switching to LTR/RTL.
- Dialog opens from overlay Edit button and bbox double-click.
- Esc / top-right red Windows-style `X` / Cancel close behavior prompts when unsaved dialog changes exist.
- `What's New` modal should use the same red Windows-style `X` close control style as the region editor dialog.
- Save commits dialog edits into the overlay document and triggers autosave lifecycle callbacks.
- Reset restores draft fields to the currently saved region values.
- Overlay edit-button visibility is an interaction baseline and should stay high-contrast unless product requirements change.
- Metadata rules:
  - Fallback `page_number` is 0-indexed (source page index).
  - Fallback `region_id` is synthesized from bbox/source match using global 1-based flattened `content_extraction` order.
- Viewer supports direct bbox drag and corner resize (`NW/NE/SW/SE`) with strict constraints:
  - Clamp to page bounds (`[0,1]` normalized space).
  - Enforce minimum logical size using `10px` converted from rendered page size.
  - Prevent flipping and preserve strict ordering (`x1 < x2`, `y1 < y2`).
- Geometry edits are auto-saved at interaction end only when bbox coordinates changed (single clicks must not trigger autosave) and reflected by save-state UI (`Saving...` then `Saved`).
- App-level undoable scope includes:
  - Viewer overlay edit commits.
  - Setup overlay-session `Load to Viewer` and clear-on-input-change transitions.
- Undo/redo actions must autosave the restored overlay session state and resolve to `Saved` (not persist in `Saving...`).
- Top-header manual `Save` should be available when an overlay session is active and should mark session state as `Saved`.
- App-level undoable scope excludes:
  - Setup Generate/Copy success/error status text.
  - Native textarea/input/contenteditable typing history (browser-managed undo/redo only).
- If overlays are loaded, editing Setup input prompts for confirmation; confirming clears the overlay edit session.
- Generate behavior with active overlay session patches edited bboxes into loaded OCR snapshot output:
  - Patch `layout_detection` bbox + label entries always.
  - Patch matched `content_extraction` entries with bbox + `region_label` + `text` when a match source exists.
  - Append `content_extraction` entries for unmatched edited regions using source page index and next fallback sequence id.
  - Normalize matched output metadata: `page_number` to 0-index source page; preserve valid `region_id`, otherwise synthesize fallback sequence.
  - Keep input textarea unchanged.
  - Round output bbox coordinates to 6 decimals.
- Setup JSON editors use uncontrolled refs + no-wrap textarea settings to keep paste and tab-switch performance responsive with large payloads.
- Setup generation output is pretty-printed JSON (`JSON.stringify` with 2-space indentation) so keys are emitted on separate lines.

## Compact Layout Notes

- `TabNav` is rendered inside the top header instead of a separate row.
- Viewer title, controls, and key metadata are intentionally kept in one compact line.
- App-level Save/undo/redo controls are in the top header bar, not inside Viewer.
- Keep future Viewer chrome changes minimal so canvas real estate remains the primary focus.

## Notes on PDF Persistence

- App stores only the latest uploaded PDF in IndexedDB.
- If user clears browser storage, startup will return to empty-state upload mode.
- No packaged default PDF is used in v1.
