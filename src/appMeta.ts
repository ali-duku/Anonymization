import type { AppMeta } from "./types/appMeta";

export const APP_META: AppMeta = {
  name: "Anonymizer",
  version: "0.7.4",
  releaseNotes: [
    {
      version: "0.7.4",
      date: "2026-03-25",
      highlights: [
        "Extended the global `BBox structure` capability so disabling it now also blocks raw text editing and text-only copy actions in overlay and region dialog flows.",
        "Kept anonymization management available while disabled: users can still add/edit/remove anonymized spans over existing text without changing raw text content.",
        "Enforced the extended gate in both UI state and handler/save paths so blocked text-changing/copy actions cannot execute through non-visual paths."
      ]
    },
    {
      version: "0.7.3",
      date: "2026-03-25",
      highlights: [
        "Updated Viewer default PDF zoom on document load to 150% (was effectively opening at larger auto-fit scales).",
        "Removed automatic fit-to-width on initial PDF load so the explicit default zoom level is applied consistently.",
        "Updated Region Context default snippet zoom in Edit Region to 75% (was 50%), including reset behavior."
      ]
    },
    {
      version: "0.7.2",
      date: "2026-03-25",
      highlights: [
        "Added a global top-header `BBox structure` toggle (persisted) as the single source of truth for structural bbox editing capability.",
        "When disabled, structural bbox actions are blocked across the app: move/resize, add, delete, full-bbox copy, and bbox paste (toolbar/dialog).",
        "Wired UI affordances and underlying action handlers to the same capability gate so disabled operations are both visibly unavailable and handler-enforced."
      ]
    },
    {
      version: "0.7.1",
      date: "2026-03-25",
      highlights: [
        "Added top-header global settings for entity-profile selection and default text direction (`RTL`/`LTR`) with persisted restore on startup.",
        "Reworked anonymization entities into a canonical profile catalog with friendly profile names, keeping stable internal identifiers and wiring active profile labels across span picker/editor flows.",
        "Updated region-editor default direction behavior so new editor sessions start from the global top-bar direction setting while preserving existing local in-dialog direction toggles."
      ]
    },
    {
      version: "0.7.0",
      date: "2026-03-25",
      highlights: [
        "Added compact inline bbox label editing directly on the outer viewer overlay, next to existing bbox action icons, with the current label shown in-place.",
        "Wired inline label changes into the canonical region edit/save flow and shared label catalog so no parallel label state/path is introduced.",
        "Preserved existing overlay interactions, dialog-based editing, color-coded bbox visuals, and generated JSON/save behavior while enabling faster on-canvas label switching."
      ]
    },
    {
      version: "0.6.12",
      date: "2026-03-25",
      highlights: [
        "Updated Edit Region `Save` so a successful save now auto-advances to the next bbox on the same page when one exists, reusing the canonical Next navigation flow.",
        "Kept save safety intact: failed/invalid save paths do not navigate, and when no next bbox exists the dialog stays on the current region as before.",
        "Fixed region dialog split constraints by protecting the right pane with a content-safe minimum width and allowing the left pane to shrink more, preventing bottom actions from being cut off."
      ]
    },
    {
      version: "0.6.11",
      date: "2026-03-25",
      highlights: [
        "Removed explicit span confirmation buttons by dropping `Save` from edit-span and `Apply` from new anonymized-span flows.",
        "Updated span entity selection so choosing an entity now applies immediately in both new and edit span dialogs.",
        "Improved nested modal behavior so `Escape` and outside-click dismiss the active (topmost) span dialog first while keeping the parent region dialog open."
      ]
    },
    {
      version: "0.6.10",
      date: "2026-03-24",
      highlights: [
        "Fixed bbox overlay misalignment risk by aligning PDF canvas and overlay stage to one canonical pixel basis (removed responsive max-width clamping from the render stage).",
        "Centralized normalized bbox projection math into shared viewer utilities so overlay CSS placement and snippet crop conversion use the same coordinate translation path.",
        "Hardened overlay-input parsing with explicit normalized-coordinate validation (`x1/y1/x2/y2` in [0..1]) and clear errors when upstream data violates the bbox contract."
      ]
    },
    {
      version: "0.6.9",
      date: "2026-03-24",
      highlights: [
        "Added `Paste BBox` in Edit Region so copied full-bbox payload can be applied directly to the currently edited bbox draft.",
        "Dialog paste now updates the active bbox in place (including copied bbox geometry/size, label, text, and entities) instead of creating a new bbox.",
        "Unified toolbar-paste (new bbox) and dialog-paste (current bbox overwrite) on one canonical full-bbox clipboard payload mapping."
      ]
    },
    {
      version: "0.6.8",
      date: "2026-03-24",
      highlights: [
        "Updated Viewer toolbar labels by renaming `Fit Width` to `Fit` and replacing page `Prev/Next` text with arrow controls while preserving behavior.",
        "Added full bbox copy actions on both overlay controls and Region Editor dialog, plus a toolbar paste action next to `Add BBox`.",
        "Added separate text-only copy actions on both overlay controls and Region Editor dialog, keeping this flow independent from full bbox copy/paste."
      ]
    },
    {
      version: "0.6.7",
      date: "2026-03-24",
      highlights: [
        "Updated on-bbox action controls to compact icon buttons (pen for edit, trash for delete) with lower opacity so page content remains visible beneath.",
        "Added direct bbox delete action on the overlay surface and wired it to the same canonical delete flow used by the Edit Region dialog.",
        "Kept existing edit/delete behavior and overlay interaction model intact while reducing on-canvas control footprint."
      ]
    },
    {
      version: "0.6.6",
      date: "2026-03-24",
      highlights: [
        "Added a global `Font size` dropdown in the top header bar with Small, Medium, and Large options.",
        "Implemented canonical app-level display settings state with localStorage persistence and automatic restore on startup.",
        "Applied font size globally through root CSS scaling so text updates consistently across the app without one-off component patches."
      ]
    },
    {
      version: "0.6.5",
      date: "2026-03-24",
      highlights: [
        "Replaced fixed entity `<select>` controls with a shared searchable entity dropdown in both the anonymization picker and span editor.",
        "Changed anonymization flow so pressing `Anonymize` starts with an empty entity input and requires explicit entity choice.",
        "Hardened entity apply validation to accept only canonical catalog labels, with warning feedback for invalid/free-typed values."
      ]
    },
    {
      version: "0.6.3",
      date: "2026-03-24",
      highlights: [
        "Expanded Edit Region dialog splitter range so the separator can move further left.",
        "Reduced the left-pane minimum-width clamp and increased the right-pane maximum-width clamp for wider right-column editing space.",
        "Kept pointer drag, keyboard resize, ARIA separator values, and session-persisted pane width behavior in sync with the new limits."
      ]
    },
    {
      version: "0.6.2",
      date: "2026-03-24",
      highlights: [
        "Added a draggable vertical outer-column separator in the Edit Region dialog (Region Context vs Edit Region panes).",
        "Added keyboard-accessible pane resizing on the separator (Arrow Left/Right with ARIA-valued separator semantics).",
        "Region dialog outer-pane width now persists per browser tab session using sessionStorage and restores after refresh/reopen."
      ]
    },
    {
      version: "0.6.1",
      date: "2026-03-18",
      highlights: [
        "Made the Edit Region dialog viewport-aware: body now scrolls safely so metadata and bottom actions remain reachable on smaller heights.",
        "Added region-context snippet protections (blocked context menu/drag save path), plus explicit zoom controls and reset.",
        "Added page-local bbox navigation (Previous/Next) in region edit mode, ordered by current page overlay sequence.",
        "Fixed anonymization UX by making the action always clickable (with selection validation feedback) and improved LTR/RTL + Anonymize hover clipping.",
        "Fixed anonymized-span popover anchoring so it opens from the selected highlighted span using stable viewport positioning."
      ]
    },
    {
      version: "0.6.0",
      date: "2026-03-18",
      highlights: [
        "Replaced local PDF upload/persistence flow with secure-simulated backend retrieval using `GET api/getfile?id=...` and strict ID validation.",
        "Added a dedicated PDF retrieval domain (`features/pdf`) with API abstraction, defensive response guards, and future-ready error states (401/403/404/500/malformed/invalid payload).",
        "Removed IndexedDB viewer persistence and startup auto-reopen behavior so PDFs load only through explicit retrieval requests."
      ]
    },
    {
      version: "0.5.0",
      date: "2026-03-18",
      highlights: [
        "Refactored the frontend to a feature-first architecture (`pages`, `components/general`, `features/setup`, `features/viewer`, `constants`, `utils`) with strict per-component folder structure.",
        "Split previously oversized Viewer and Setup modules into focused hooks, reusable subcomponents, and CSS Modules while preserving existing behavior.",
        "Modularized annotation generation/parsing internals into dedicated parsing, matching, patching, and JSON-error helpers with the same public service contract."
      ]
    },
    {
      version: "0.4.22",
      date: "2026-03-17",
      highlights: [
        "Added Viewer `Add BBox` drag-to-draw creation for loaded overlay sessions, with the same bbox validation rules used by move/resize edits.",
        "Newly created bboxes now behave like other regions (edit/delete/anonymize) and are included in generated JSON output.",
        "Extended overlay provenance so user-added regions use nullable snapshot sources and generation appends both layout_detection and content_extraction entries canonically.",
      ]
    },
    {
      version: "0.4.21",
      date: "2026-03-17",
      highlights: [
        "Expanded the canonical anonymization entity catalog with all labels discovered in the anonymised OCR fixture and standardized ordering in one shared source.",
        "Aligned region-dialog text input and anonymization preview spacing/sizing so both columns now render with matching surfaces.",
        "Made top-header `Generate JSON` use the same primary button style as `What's New`, and split Setup bottom controls into pinned left/right single-line lanes for load/output status.",
      ]
    },
    {
      version: "0.4.20",
      date: "2026-03-17",
      highlights: [
        "Unified anonymization entity canonicalization into a shared module consumed by Viewer and annotation generation/parsing flows.",
        "Hardened span picker/editor state transitions with canonical entity writes and stricter stale-span render guards to prevent blank-screen paths."
      ]
    },
    {
      version: "0.4.19",
      date: "2026-03-17",
      highlights: [
        "Hardened anonymization entity editing flow to prevent blank-screen crashes from stale/invalid span state.",
        "Added canonical entity-label coercion and malformed-span normalization so unsupported labels safely fall back to `???`.",
        "Added stale span-index guards for edit/remove actions and dialog auto-close when edited spans are no longer valid.",
      ]
    },
    {
      version: "0.4.18",
      date: "2026-03-17",
      highlights: [
        "Fixed anonymized-span editor anchoring so the popover now opens from the actual double-clicked highlighted span.",
        "Changed span-editor positioning from viewport-fixed to dialog-relative coordinates for stable placement inside the editor modal.",
      ]
    },
    {
      version: "0.4.17",
      date: "2026-03-17",
      highlights: [
        "Aligned dialog Text controls so `Anonymize` and direction toggle buttons share the same visual height.",
        "Normalized text-input and anonymization-preview header spacing/sizing so both columns match consistently.",
        "Moved anonymized-span editing UI into a floating popover anchored to the double-clicked highlighted text instead of rendering inline below the dialog.",
      ]
    },
    {
      version: "0.4.16",
      date: "2026-03-17",
      highlights: [
        "Updated region dialog layout to render text input and anonymization preview side-by-side instead of stacked.",
        "Moved anonymization entity picker to appear directly under the `Anonymize` button area in the dialog controls.",
        "Fixed unstable entity-label handling by restoring the developer label catalog with correct Arabic text encoding to prevent selection-related blank-screen crashes.",
      ]
    },
    {
      version: "0.4.15",
      date: "2026-03-17",
      highlights: [
        "Replaced region dialog text editing with a canonical textarea input plus synchronized anonymization preview to fix reversed/duplicated character typing issues.",
        "Selection no longer triggers entity UI automatically; entity picker appears only after clicking `Anonymize`.",
        "Kept RTL default with explicit RTL/LTR toggle, and ensured span remapping shifts post-cursor spans deterministically after text edits.",
        "Span editing remains entity-change/remove only (no manual start/end index controls), while generated JSON `entities` output semantics are unchanged.",
      ]
    },
    {
      version: "0.4.14",
      date: "2026-03-16",
      highlights: [
        "Updated dialog anonymization flow: selecting text does nothing by itself; entity picker opens only after pressing `Anonymize`.",
        "Removed manual span index editing (no direct start/end edits) and kept double-click span editing to entity change/remove only.",
        "Fixed region dialog text editor focus loss while typing so caret no longer drops after each character.",
        "Generated OCR JSON now emits `content_extraction[*].entities` with exact 0-based inclusive/exclusive indices, including patched and appended regions (`[]` when none).",
      ]
    },
    {
      version: "0.4.13",
      date: "2026-03-16",
      highlights: [
        "Setup `Load to Viewer` now prompts for confirmation when the active overlay session contains viewer edits (bbox/text changes).",
        "Cancelling the prompt keeps current overlays untouched; confirming proceeds to parse and load the new input JSON.",
      ]
    },
    {
      version: "0.4.12",
      date: "2026-03-16",
      highlights: [
        "Region editor Delete now prompts for confirmation and fully removes the selected bbox from the overlay session.",
        "Generate JSON now removes deleted regions from both `layout_detection` and matched `content_extraction` entries.",
        "Aligned the dialog Delete button visual style to the same red close-button color family used by the top-right `X` control.",
      ]
    },
    {
      version: "0.4.11",
      date: "2026-03-16",
      highlights: [
        "Added a top-bar manual Save button for active overlay sessions.",
        "Undo/redo now triggers overlay autosave normalization so restored states are marked Saved instead of staying in Saving status.",
      ]
    },
    {
      version: "0.4.10",
      date: "2026-03-16",
      highlights: [
        "Moved Undo/Redo controls from the Viewer toolbar into the global top header bar.",
        "Kept Undo/Redo behavior and shortcuts unchanged while making controls available in a consistent top-level location.",
      ]
    },
    {
      version: "0.4.9",
      date: "2026-03-16",
      highlights: [
        "Added app-level undo/redo history for overlay edits and Setup overlay-session load/clear transitions.",
        "Added keyboard shortcuts for history navigation: Ctrl/Cmd+Z (undo), Ctrl+Y and Ctrl/Cmd+Shift+Z (redo).",
        "Undo/redo now skips native editable fields (input/textarea/select/contenteditable) so textbox undo/redo behavior is not hijacked.",
      ]
    },
    {
      version: "0.4.8",
      date: "2026-03-16",
      highlights: [
        "Set the region editor text box to RTL by default for bbox text editing.",
        "Added a one-click direction toggle button to switch the text box between RTL and LTR.",
      ]
    },
    {
      version: "0.4.7",
      date: "2026-03-16",
      highlights: [
        "Aligned the What's New dialog close control with the region editor by reusing the same red square `X` button.",
        "Adjusted close-glyph sizing/line metrics so the `X` is visually centered in the red close button.",
      ]
    },
    {
      version: "0.4.6",
      date: "2026-03-16",
      highlights: [
        "Updated the region editor close control to a centered Windows-style `X` mark for cleaner alignment.",
        "Restyled the close button with a dedicated red visual treatment that better matches the app aesthetic.",
      ]
    },
    {
      version: "0.4.5",
      date: "2026-03-16",
      highlights: [
        "Fixed the region editor close button glyph to use a stable ASCII `X` so it no longer renders as a missing-character icon.",
        "Fixed bbox edit autosave behavior: single click (pointer down/up without movement) no longer triggers save callbacks.",
        "Overlay autosave now commits only when bbox geometry actually changes."
      ]
    },
    {
      version: "0.4.4",
      date: "2026-03-16",
      highlights: [
        "Enabled full region dialog editing: label dropdown, editable text, Save/Reset behavior, and close-confirm on unsaved changes.",
        "Added double-click bbox editing and Escape-to-close support with dirty-state confirmation.",
        "Generate JSON now patches edited label/text values and creates content_extraction entries for unmatched regions."
      ]
    },
    {
      version: "0.4.3",
      date: "2026-03-16",
      highlights: [
        "Changed Generate JSON output to pretty-printed serialization (2-space indentation) so keys appear on separate lines.",
        "Applied the same pretty-print formatting to overlay-session patched generation output.",
        "Kept Setup textareas non-wrapping so generated JSON displays without soft-wrap line breaks."
      ]
    },
    {
      version: "0.4.2",
      date: "2026-03-16",
      highlights: [
        "Fully optimized Setup input/output textareas for very large JSON payloads (non-wrapping, reduced browser text overhead).",
        "Reduced Setup tab switch cost by avoiding unnecessary hidden-tab rerenders during Viewer overlay edit updates.",
        "Changed generated JSON output to compact serialization so values stay on single lines."
      ]
    },
    {
      version: "0.4.1",
      date: "2026-03-16",
      highlights: [
        "Fixed bbox metadata fallback page numbering to 0-indexed values.",
        "Added bbox-based fallback `region_id` synthesis and output metadata normalization for matched content regions.",
        "Improved Setup tab responsiveness by switching large JSON textareas to uncontrolled refs."
      ]
    },
    {
      version: "0.4.0",
      date: "2026-03-16",
      highlights: [
        "Added direct bbox drag and 4-corner resize editing with strict page bounds, min-size, and no-flip geometry rules.",
        "Viewer now auto-saves bbox geometry edits and shows live save state (Saving... then Saved).",
        "Generate JSON now patches edited bbox coordinates back in-place into loaded OCR snapshot regions."
      ]
    },
    {
      version: "0.3.2",
      date: "2026-03-16",
      highlights: [
        "Improved overlay edit-button visibility with stronger default contrast.",
        "Made edit controls easier to spot without relying on hover state.",
        "Refined overlay button styling for clearer interaction affordance."
      ]
    },
    {
      version: "0.3.1",
      date: "2026-03-16",
      highlights: [
        "Moved Viewer/Setup tab toggle into the top header bar for a tighter layout.",
        "Compacted Viewer title, controls, and key metadata into a single top line.",
        "Reduced vertical UI footprint so the PDF canvas remains the main focus."
      ]
    },
    {
      version: "0.3.0",
      date: "2026-03-15",
      highlights: [
        "Added JSON-driven overlay loading from Setup with a dedicated Load to Viewer button.",
        "Viewer now renders color-coded layout regions over PDF pages and matches content by bbox.",
        "Added per-region edit dialog with text display, collapsible metadata, and placeholder actions."
      ]
    },
    {
      version: "0.2.1",
      date: "2026-03-15",
      highlights: [
        "Updated to a full-screen minimal layout with a top-pinned header and no outer gaps.",
        "Removed non-essential UI text in Header, Viewer, and Setup for a cleaner interface.",
        "Fixed tab-switch empty-scroll issue and stabilized Setup copy feedback to avoid flicker."
      ]
    },
    {
      version: "0.2.0",
      date: "2026-03-15",
      highlights: [
        "Initial production-ready release with dark-only UI.",
        "PDF-first workflow with persistent last-uploaded file.",
        "Setup tab for JSON validation, formatting, and one-click copy."
      ]
    },
    {
      version: "0.1.0",
      date: "2026-03-14",
      highlights: [
        "App shell, tab structure, and metadata foundation.",
        "Early IndexedDB storage model and service contracts."
      ]
    }
  ]
};




