import type { OverlayDocument, OverlaySaveState } from "../../../../types/overlay";
import type { PdfRetrievalService } from "../../../../types/services";

export interface PdfWorkspaceTabProps {
  pdfRetrievalService: PdfRetrievalService;
  overlayDocument?: OverlayDocument | null;
  overlaySaveState?: OverlaySaveState | null;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
  onClearOverlaySessionForDocumentSwitch?: () => void;
}
