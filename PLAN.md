## Searchable Entity Dropdown Enhancement (No UI Redesign)

### Summary
Implement a safe, additive upgrade so both entity controls (new-entity apply dialog and span edit/save dialog) support inline typing with live substring filtering, while preserving:
- existing canonical entity values,
- existing apply/save validation and behavior,
- existing visual layout/styling footprint.

Chosen behavior: typing is filter-only; selected entity changes only when user explicitly picks an option.

### Implementation Changes
1. Add a shared searchable entity field component in the existing viewer component structure (same feature module), and reuse it in both places currently using plain `<select>`.
- Inputs: `value`, `entityLabels`, `coerceEntityLabel`, `onChange`, and an `id/label` hook for accessibility.
- Internal state: `query` (typed text), initialized/synced from the current selected value.
- Filtering: case-insensitive substring on displayed option label (`entityLabels`), preserving Arabic/English labels.
- Selection semantics: selecting an option updates canonical value via existing `coerceEntityLabel` flow.
- Commit rule (locked): if user types but does not pick a different option, apply/save keeps previously selected entity.

2. Replace current entity `<select>` usage in:
- `EntityPicker` (new/apply flow),
- `SpanEditorPopover` (edit/save flow),
with the shared searchable field, without changing button positions, dialog structure, or action wiring.

3. Keep component contracts and hook wiring stable.
- Do not change `useRegionEditor` business rules (overlap checks, warnings, save/apply handlers).
- Do not change entity data source (`ANONYMIZATION_ENTITY_LABELS`) or persisted span shape.
- Do not broaden accepted entities beyond the canonical list.

4. Styling strategy (conservative).
- Reuse existing control class names/tokens (`.select`, label styles) to keep visual appearance aligned.
- Add only minimal CSS necessary for dropdown list rendering/visibility behavior, matching current spacing/size.
- No layout or action-row changes in either dialog.

### Verification Plan
1. Build/type safety
- Run TypeScript + build to ensure no regressions in compile pipeline.

2. New-entity dialog checks
- Select text → Anonymize → type query (e.g., `th`) → list shows only matching labels.
- Click an option → `Apply Entity` still adds span exactly as before.
- Type without selecting a new option → apply uses prior selected entity.
- Existing overlap/selection warnings still trigger unchanged.

3. Edit-span dialog checks
- Open span editor → current entity prefilled.
- Type query → list filters live.
- Select option → `Save Span` updates entity as before.
- `Remove Span` and `Cancel` unchanged.

4. UX/regression checks
- Keyboard/mouse still functional (focus, typing, click selection, apply/save buttons).
- Dialog placement, spacing, and button arrangement unchanged.
- No changes to unrelated viewer/setup/pdf flows.

### Assumptions / Defaults
- Matching is case-insensitive substring against displayed label text.
- Filtering does not create new custom entities.
- Canonical entity value remains explicit user selection from list (not auto-selected from filter results).
