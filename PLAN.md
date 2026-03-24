### Region Dialog Outer-Column Resizer with Session Persistence

#### Summary
Implement a draggable vertical separator in the bbox region editor dialog for the **outer layout only** (`Region Context` pane vs `Edit Region` pane), and persist the chosen width in **`sessionStorage` per browser tab/window session**.  
Keep the implementation aligned with current repo architecture (feature-first, modular hooks/utils, CSS Modules, typed props/contracts).

#### Implementation Changes
1. Add a dedicated viewer hook for splitter state/drag behavior.
- Create `src/features/viewer/hooks/useRegionDialogLayout.ts`.
- Responsibilities:
  - Own right-pane width state.
  - Read/write persisted width from `sessionStorage`.
  - Clamp width with canonical min/max constraints and viewport-safe bounds.
  - Expose drag handlers (`onPointerDown`) and accessibility handlers (`onKeyDown`) for separator.
  - Expose computed layout values (right pane width, separator ARIA values, dragging state).
- Add constants in `src/features/viewer/constants/viewerConstants.ts` for:
  - storage key
  - default width
  - min/max width
  - keyboard step size
  - min left-pane width guard

2. Integrate hook into `RegionEditorModal`.
- Update `src/features/viewer/components/RegionEditorModal/RegionEditorModal.tsx`:
  - Use the new layout hook internally (no extra prop drilling needed).
  - Render a vertical separator element between snippet pane and modal card.
  - Apply dynamic grid sizing through inline style/CSS variable from hook output.
  - Add separator semantics:
    - `role="separator"`
    - `aria-orientation="vertical"`
    - `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
    - keyboard resize with arrows
  - Keep behavior disabled on mobile breakpoint (single-column mode), preserving existing responsive flow.

3. Update modal CSS for 3-column shell (left | splitter | right).
- Update `src/features/viewer/components/RegionEditorModal/RegionEditorModal.module.css`:
  - Convert shell grid to include separator track.
  - Add separator visual states (default/hover/active drag cursor).
  - Ensure drag UX is robust (no layout jump, no text selection during drag, clear affordance).
  - Preserve existing breakpoints and fallback to stacked layout below `1024px`.
  - Keep current look-and-feel tokens and class naming conventions.

4. Keep contracts stable and modular.
- `RegionEditorModal.types.ts` stays stable unless type-safe separator callbacks must be surfaced; prefer internal hook usage to avoid widening public component API.
- No change to viewer orchestration unless needed for strict dependency boundaries.

5. Docs and patch notes.
- Update `src/appMeta.ts`:
  - bump version (next patch)
  - prepend release note entry describing draggable outer separator + session persistence.
- Update `README.md` “Latest Update” and feature bullets.
- Update `docs/ARCHITECTURE.md` viewer section to include region dialog layout-resizer ownership.
- Update `docs/MAINTENANCE.md` baseline notes for the new dialog capability.

#### Test Plan
1. Functional
- Open region dialog and drag outer separator left/right; both panes resize smoothly.
- Close and reopen dialog within same tab session; width is restored.
- Refresh page in same tab session; width is restored.
- Open in a new tab/window; width starts from default.
- On viewport width `<=1024px`, no draggable separator shown and stacked layout remains intact.

2. UX/Accessibility
- Separator has `col-resize` cursor and visible active state while dragging.
- Keyboard left/right resize works when separator is focused.
- ARIA separator attributes reflect current values.

3. Regression
- Snippet zoom controls still work.
- Previous/Next region navigation still works.
- Text editing, anonymization picker, span popover, metadata, save/reset/delete/close all remain unchanged.
- No impact on overlay save/edit flows.

4. Build/quality
- Run `npm run build` successfully.
- Verify no type errors and no lint/style regressions in changed modules.

#### Assumptions
- “Resize each column manually” is interpreted as resizing the **outer dialog columns only** (as requested), not the inner Text/Preview split.
- Persistence scope is explicitly **`sessionStorage` per-tab session**, not cross-browser persistent storage.
