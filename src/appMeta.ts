import type { AppMeta } from "./types/appMeta";

export const APP_META: AppMeta = {
  name: "Anonymizer",
  version: "0.4.11",
  releaseNotes: [
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
        "Aligned the Whatâ€™s New dialog close control with the region editor by reusing the same red square `X` button.",
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

