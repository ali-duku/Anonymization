### Fix Blank-Screen Span-Entity Editing (Root Cause + Canonicalization Everywhere)

#### Summary
Unify anonymization entity canonicalization across Viewer + Annotation service, harden span-editor state transitions to eliminate render-time crashes, and add targeted regression tests for “edit span entity to a different value” plus malformed/non-canonical entity payloads.

#### Key Implementation Changes
1. **Create one canonical entity module and use it everywhere**
   - Add a shared module (move or re-home current entity catalog from Viewer-only scope) as the single source of truth for:
     - entity label catalog
     - fallback label (`آخر`)
     - entity coercion utility
     - span normalization utility (range validity + overlap + canonical entity coercion)
   - Update both:
     - [`src/viewer/components/PdfViewerTab.tsx`](c:\Users\alidu\Downloads\out\Anonymization\src\viewer\components\PdfViewerTab.tsx)
     - [`src/services/annotationService.ts`](c:\Users\alidu\Downloads\out\Anonymization\src\services\annotationService.ts)
   - Remove duplicate/divergent normalization logic.

2. **Harden span editor and picker state to prevent blank-screen paths**
   - In Viewer:
     - canonicalize entity values at state-write boundaries (`pendingEntity`, `spanEditor.entity`), not only at save time.
     - enforce safe access for span editor render/edit paths (stale index + missing span + invalid entity).
     - ensure preview rendering never dereferences an invalid span index (strict guard before `normalizedDraftEntities[...]` usage).
   - Keep current stale-span guard behavior, but make all entity transitions deterministic/canonical.

3. **Canonicalize generated/parsed OCR entities in annotation service**
   - In parse and generate flows:
     - normalize/coerce all entity labels to canonical labels/fallback.
     - keep existing constraints (`start/end` integer bounds, no overlap, in-range for text).
   - This closes the remaining path where non-canonical entities can persist in overlay/session/output.

4. **Keep docs/meta/version aligned with behavior**
   - Add a new release note entry in:
     - [`src/appMeta.ts`](c:\Users\alidu\Downloads\out\Anonymization\src\appMeta.ts)
   - Update behavior notes in:
     - [`README.md`](c:\Users\alidu\Downloads\out\Anonymization\README.md)
     - [`docs/ARCHITECTURE.md`](c:\Users\alidu\Downloads\out\Anonymization\docs\ARCHITECTURE.md)
     - [`docs/MAINTENANCE.md`](c:\Users\alidu\Downloads\out\Anonymization\docs\MAINTENANCE.md)
   - Bump version in:
     - [`package.json`](c:\Users\alidu\Downloads\out\Anonymization\package.json)

#### Test Plan
1. **Viewer regression tests (blank-screen reproduction path)**
   - Extend [`src/viewer/components/PdfViewerTab.test.tsx`](c:\Users\alidu\Downloads\out\Anonymization\src\viewer\components\PdfViewerTab.test.tsx):
     - open region dialog with an existing anonymized span
     - double-click highlighted span
     - change entity to a different option
     - save span + save dialog
     - assert document persists with updated entity and no render crash.
   - Add malformed/non-canonical entity test:
     - seed overlay with invalid entity labels
     - verify editor opens safely, coerces to fallback/selectable value, and remains stable.

2. **Annotation service canonicalization tests**
   - Extend [`src/services/annotationService.test.ts`](c:\Users\alidu\Downloads\out\Anonymization\src\services\annotationService.test.ts):
     - parseOverlayInput canonicalizes unknown labels to fallback.
     - generateWithOverlayEdits outputs canonicalized entities for patched/appended regions.
     - malformed spans are filtered without throwing.

3. **Shared canonical utility tests**
   - Add/extend tests for coercion + normalization in one place (new shared test file) to lock canonical behavior and avoid future divergence.

4. **Verification**
   - Run full suite: `npm run test:run`
   - Build validation: `npm run build`

#### Assumptions / Defaults
- Canonical behavior for unsupported entity labels remains: **coerce to `آخر`**, never throw.
- Overlapping/invalid spans continue to be dropped (with existing warning behavior in Viewer).
- Fix prioritizes root-cause stability (state + normalization consistency) over adding broad error-boundary masking.
