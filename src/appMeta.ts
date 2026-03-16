import type { AppMeta } from "./types/appMeta";

export const APP_META: AppMeta = {
  name: "Anonymizer",
  version: "1.2.3",
  releaseNotes: [
    {
      version: "1.2.3",
      date: "2026-03-16",
      highlights: [
        "Changed Generate JSON output to pretty-printed serialization (2-space indentation) so keys appear on separate lines.",
        "Applied the same pretty-print formatting to overlay-session patched generation output.",
        "Kept Setup textareas non-wrapping so generated JSON displays without soft-wrap line breaks."
      ]
    },
    {
      version: "1.2.2",
      date: "2026-03-16",
      highlights: [
        "Fully optimized Setup input/output textareas for very large JSON payloads (non-wrapping, reduced browser text overhead).",
        "Reduced Setup tab switch cost by avoiding unnecessary hidden-tab rerenders during Viewer overlay edit updates.",
        "Changed generated JSON output to compact serialization so values stay on single lines."
      ]
    },
    {
      version: "1.2.1",
      date: "2026-03-16",
      highlights: [
        "Fixed bbox metadata fallback page numbering to 0-indexed values.",
        "Added bbox-based fallback `region_id` synthesis and output metadata normalization for matched content regions.",
        "Improved Setup tab responsiveness by switching large JSON textareas to uncontrolled refs."
      ]
    },
    {
      version: "1.2.0",
      date: "2026-03-16",
      highlights: [
        "Added direct bbox drag and 4-corner resize editing with strict page bounds, min-size, and no-flip geometry rules.",
        "Viewer now auto-saves bbox geometry edits and shows live save state (Saving... then Saved).",
        "Generate JSON now patches edited bbox coordinates back in-place into loaded OCR snapshot regions."
      ]
    },
    {
      version: "1.1.2",
      date: "2026-03-16",
      highlights: [
        "Improved overlay edit-button visibility with stronger default contrast.",
        "Made edit controls easier to spot without relying on hover state.",
        "Refined overlay button styling for clearer interaction affordance."
      ]
    },
    {
      version: "1.1.1",
      date: "2026-03-16",
      highlights: [
        "Moved Viewer/Setup tab toggle into the top header bar for a tighter layout.",
        "Compacted Viewer title, controls, and key metadata into a single top line.",
        "Reduced vertical UI footprint so the PDF canvas remains the main focus."
      ]
    },
    {
      version: "1.1.0",
      date: "2026-03-15",
      highlights: [
        "Added JSON-driven overlay loading from Setup with a dedicated Load to Viewer button.",
        "Viewer now renders color-coded layout regions over PDF pages and matches content by bbox.",
        "Added per-region edit dialog with text display, collapsible metadata, and placeholder actions."
      ]
    },
    {
      version: "1.0.1",
      date: "2026-03-15",
      highlights: [
        "Updated to a full-screen minimal layout with a top-pinned header and no outer gaps.",
        "Removed non-essential UI text in Header, Viewer, and Setup for a cleaner interface.",
        "Fixed tab-switch empty-scroll issue and stabilized Setup copy feedback to avoid flicker."
      ]
    },
    {
      version: "1.0.0",
      date: "2026-03-15",
      highlights: [
        "Initial production-ready release with dark-only UI.",
        "PDF-first workflow with persistent last-uploaded file.",
        "Setup tab for JSON validation, formatting, and one-click copy."
      ]
    },
    {
      version: "0.9.0",
      date: "2026-03-14",
      highlights: [
        "App shell, tab structure, and metadata foundation.",
        "Early IndexedDB storage model and service contracts."
      ]
    }
  ]
};
