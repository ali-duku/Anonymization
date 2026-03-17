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
- Region dialog anonymization spans are developer-label constrained (no user-defined labels):
  - span shape: `{ start, end, entity }`
  - 0-based indexing, `start` inclusive, `end` exclusive
  - spaces/punctuation/newlines count in indexing
  - spans must satisfy `start < end`, stay within current text length, and not overlap.
- Developer entity labels must be stored UTF-8 cleanly (Arabic labels included) to avoid runtime rendering/selection instability.
- Entity labels must be canonicalized before use; invalid/unknown labels should safely coerce to fallback `آخر`.
- Keep canonical entity-label catalog/coercion/span-normalization in src/shared/anonymizationEntities.ts; Viewer and annotation service should not maintain divergent copies.
- New user-added regions must store `layoutSource: null` and `contentSource: null` until generation appends snapshot output records.
- Canonical label list should remain deduplicated and alphabetically ordered, and must include entities discovered in committed anonymised OCR fixtures.
- Region dialog `Anonymize` operates on current continuous selection and applies chosen entity label from fixed list.
- Selection alone should not open entity picker; picker appears only after pressing `Anonymize`.
- Entity picker should render directly under the anonymize controls in the dialog header area.
- Highlighted anonymized spans are double-click editable through an anchored floating popover for entity change/remove only (no manual start/end editing).
- Popover anchoring must use dialog-relative coordinates so it emerges from the clicked span and remains stable within the modal.
- Span-edit actions must guard against stale span indexes (e.g., spans removed by text remap) and close gracefully instead of throwing.
- Region text editing uses a canonical textarea input, while highlights render in a synchronized read-only preview.
- Text input and highlight preview should remain side-by-side in desktop layouts (stacking only in narrow responsive view).
- Viewer dialog text input and preview surfaces should retain matched spacing and dimensions for visual parity.
- Keep text-toolbar controls (`Anonymize`, direction toggle) at consistent visual height and preserve matched heading/box spacing between input and preview columns.
- Text edits perform deterministic remapping for span indices (before-edit spans unchanged, after-edit spans shifted by delta); irreconcilable spans are dropped and surfaced to the user.
- Region dialog `Delete` must always prompt for confirmation before removing a bbox region.
- Region dialog text field defaults to RTL and must keep an explicit in-dialog toggle for switching to LTR/RTL.
- Dialog opens from overlay Edit button and bbox double-click.
- Esc / top-right red Windows-style `X` / Cancel close behavior prompts when unsaved dialog changes exist.
- `What's New` modal should use the same red Windows-style `X` close control style as the region editor dialog.
- Save commits dialog edits into the overlay document and triggers autosave lifecycle callbacks.
- Confirmed Delete removes the region from the overlay document immediately and is undoable through app-level history.
- Reset restores draft fields to the currently saved region values.
- Overlay edit-button visibility is an interaction baseline and should stay high-contrast unless product requirements change.
- Metadata rules:
  - Fallback `page_number` is 0-indexed (source page index).
  - Fallback `region_id` is synthesized from bbox/source match using global 1-based flattened `content_extraction` order.
- Viewer supports direct bbox drag and corner resize (`NW/NE/SW/SE`) with strict constraints:
- Viewer `Add BBox` creation should be available only when a loaded overlay session exists and must use drag-to-draw interaction.
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
- If current overlay session has viewer edits, pressing `Load to Viewer` must prompt for confirmation before replacing overlays from Setup input.
- Generate behavior with active overlay session patches edited bboxes into loaded OCR snapshot output:
  - Patch `layout_detection` bbox + label entries always.
  - Patch matched `content_extraction` entries with bbox + `region_label` + `text` + `entities` when a match source exists.
  - Remove deleted regions from `layout_detection` and remove their linked matched `content_extraction` entries.
  - Append `content_extraction` entries for unmatched edited regions using source page index and next fallback sequence id, including `entities`.
  - Generate must append user-added regions to both `pipeline_steps.layout_detection[*].regions` and `pipeline_steps.content_extraction[*]`.
  - Always emit `entities` as an array on generated `content_extraction` entries (`[]` when none).
  - Normalize matched output metadata: `page_number` to 0-index source page; preserve valid `region_id`, otherwise synthesize fallback sequence.
  - Keep input textarea unchanged.
  - Round output bbox coordinates to 6 decimals.
- Setup JSON editors use uncontrolled refs + no-wrap textarea settings to keep paste and tab-switch performance responsive with large payloads.
- Setup generation output is pretty-printed JSON (`JSON.stringify` with 2-space indentation) so keys are emitted on separate lines.
- Setup bottom controls should stay pinned and split into left/right single-line status lanes.
- Top-header `Generate JSON` should keep primary style parity with `What's New`.

## Compact Layout Notes

- `TabNav` is rendered inside the top header instead of a separate row.
- Viewer title, controls, and key metadata are intentionally kept in one compact line.
- App-level Save/undo/redo controls are in the top header bar, not inside Viewer.
- Keep future Viewer chrome changes minimal so canvas real estate remains the primary focus.

## Notes on PDF Persistence

- App stores only the latest uploaded PDF in IndexedDB.
- If user clears browser storage, startup will return to empty-state upload mode.
- No packaged default PDF is used in v1.

