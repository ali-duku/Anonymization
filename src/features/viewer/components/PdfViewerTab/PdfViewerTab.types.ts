import type { OverlayDocument, OverlaySaveState } from "../../../../types/overlay";
import type { StorageService } from "../../../../types/services";

export interface PdfViewerTabProps {
  storageService: StorageService;
  overlayDocument?: OverlayDocument | null;
  overlaySaveState?: OverlaySaveState | null;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}
