import type { OverlayDocument } from "../../../types/overlay";
import type { TextDirection } from "../../../types/textDirection";
import type { BboxClipboardPayload } from "../utils/bboxClipboard";

export type { TextDirection } from "../../../types/textDirection";

export interface SpanEditorDraft {
  index: number;
  entity: string;
  anchorX: number;
  anchorY: number;
}

export interface UseRegionEditorOptions {
  overlayDocument: OverlayDocument | null;
  currentPage: number;
  copiedBbox: BboxClipboardPayload | null;
  isBboxStructuralEditingEnabled: boolean;
  isRawTextEditingEnabled: boolean;
  anonymizationEntityLabels: readonly string[];
  defaultAnonymizationEntityLabel: string;
  defaultTextDirection: TextDirection;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument, action?: string) => void;
}
