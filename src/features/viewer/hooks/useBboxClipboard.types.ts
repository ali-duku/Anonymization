import type { OverlayDocument } from "../../../types/overlay";
import type { BboxClipboardPayload } from "../utils/bboxClipboard";

export type { BboxClipboardPayload };

export interface UseBboxClipboardOptions {
  overlayDocument: OverlayDocument | null;
  currentPage: number;
  isBboxStructuralEditingEnabled: boolean;
  isTextCopyEnabled: boolean;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}
