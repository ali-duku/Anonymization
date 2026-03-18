## Production-Grade Frontend Refactor Plan

### Summary
- Execute a full architecture refactor while preserving current behavior.
- Enforce strict component foldering: every component in its own folder with exactly:
  - `ComponentName.tsx`
  - `ComponentName.types.ts`
  - `ComponentName.module.css`
- Eliminate oversized files by splitting UI, hooks, and domain logic.
- Improve rendering and bundle performance via state isolation, memoization boundaries, and lazy loading.

### Implementation Changes
1. **Rebuild `src` into feature-first structure**
- `src/components/general/` for shared UI primitives and shell pieces.
- `src/features/viewer/` for PDF + overlays + region editor.
- `src/features/setup/` for JSON input/generate/load workflow.
- `src/hooks/`, `src/utils/`, `src/constants/`, `src/services/`, `src/types/`, `src/pages/`.

2. **Convert all current components to 3-file folder pattern**
- Migrate:
  - `App.tsx` to `src/pages/AppPage/`
  - `Header`, `TabNav`, `WhatsNewModal` to `src/components/general/...`
  - `SetupTab` to `src/features/setup/components/SetupTab/`
  - `PdfViewerTab` to `src/features/viewer/components/PdfViewerTab/`
- Replace `src/styles.css` with:
  - global base/tokens CSS (minimal, app-wide only)
  - per-component CSS modules.

3. **Split `PdfViewerTab.tsx` (1734 lines) into focused units**
- Components:
  - `ViewerToolbar`
  - `ViewerCanvasStage`
  - `OverlayLayer`
  - `OverlayBox`
  - `RegionEditorModal`
  - `EntityPicker`
  - `SpanEditorPopover`
  - `ViewerStatus`
- Hooks:
  - `usePdfDocument`
  - `useViewerPersistence`
  - `useOverlayInteractions`
  - `useCreateBBox`
  - `useRegionEditor`
- Utils/constants:
  - bbox helpers
  - text/entity remap and segment builders
  - palette and viewer constants
- Keep behavior parity for drag/resize/create/edit/delete/anonymize/save state.

4. **Split `SetupTab.tsx` into presentation + workflow**
- Components:
  - `SetupInputPane`
  - `SetupOutputPane`
  - `SetupFooterActions`
  - `SetupStatusRegion`
- Hook:
  - `useSetupJsonWorkflow` for generate/copy/load/clear-confirm logic.
- Keep uncontrolled textarea performance behavior.

5. **Decompose `annotationService.ts` (large mixed responsibilities)**
- Keep `BrowserAnnotationService` as orchestrator.
- Extract modules:
  - parse/validation
  - bbox/content matching
  - patch/appends/pruning
  - JSON error parsing helpers
- Preserve public `AnnotationService` interface and output contract.

6. **Performance and code splitting**
- Lazy-load feature tabs (`Viewer`, `Setup`) with `React.lazy` + `Suspense`.
- Lazy-load `WhatsNewModal`.
- Keep state localized inside feature hooks/components to prevent parent-wide rerenders.
- Use `React.memo` only on stable leaf components (overlay boxes, toolbar groups, modal sections).
- Add stable callback patterns where they reduce prop churn.

7. **Cleanup and consistency**
- Remove dead code, duplicated helpers, unused imports, and empty/obsolete folders.
- Normalize imports and naming conventions.
- Keep domain types centralized, with component props/types colocated in component `.types.ts`.

8. **Documentation and maintenance alignment**
- Update:
  - `docs/ARCHITECTURE.md`
  - `docs/MAINTENANCE.md`
  - `README.md` structure/performance sections
  - `src/appMeta.ts` release note entry for this refactor.

### Validation Plan
1. Run `npm.cmd run build` and resolve all TypeScript/lint-style issues.
2. Verify behavior parity manually:
- Upload/restore PDF.
- Page/zoom/fit controls.
- Overlay drag/resize/create/delete.
- Region dialog save/reset/cancel/escape confirmation.
- Text anonymization selection/picker/span edit/remove.
- Setup generate/copy/load-to-viewer confirmation flows.
- App-level Save/Undo/Redo and keyboard shortcuts.
3. Confirm no oversized frontend files remain (target: component files kept focused; large service logic modularized).

### Assumptions
- Styling strategy is **CSS Modules** (selected), with a minimal global base/tokens stylesheet.
- Existing runtime behavior and data contracts remain unchanged.
- Existing deleted test files in current git state are not restored unless explicitly requested; refactor focuses on production architecture and behavior safety.
