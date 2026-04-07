import type { OverlayDocument, OverlaySaveState } from "../../../../types/overlay";
import type { PdfRetrievalService } from "../../../../types/services";
import type { TextDirection } from "../../../../types/textDirection";

export interface PdfWorkspaceTabProps {
  pdfRetrievalService: PdfRetrievalService;
  overlayDocument?: OverlayDocument | null;
  overlaySaveState?: OverlaySaveState | null;
  anonymizationEntityLabels: readonly string[];
  defaultAnonymizationEntityLabel: string;
  defaultTextDirection: TextDirection;
  isBboxStructuralEditingEnabled: boolean;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument, action?: string) => void;
  onActivePdfIdentityChange?: (nextPdfIdentityKey: string | null) => void;
}
