import type { OverlayDocument } from "../../../types/overlay";
import type { BboxClipboardPayload } from "../utils/bboxClipboard";

export type { BboxClipboardPayload };

export interface UseBboxClipboardOptions {
  overlayDocument: OverlayDocument | null;
  currentPage: number;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}
