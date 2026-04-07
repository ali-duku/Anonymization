import type { OverlayEditSession, OverlayLoadPayload } from "../../../../types/overlay";
import type { AnnotationService, JsonService } from "../../../../types/services";

export interface SetupTabProps {
  jsonService: JsonService;
  annotationService: AnnotationService;
  overlaySession: OverlayEditSession | null;
  onLoadToViewer: (payload: OverlayLoadPayload) => void;
  onClearOverlaySession: () => void;
  onOverlayGenerated?: () => void;
  onGenerateJsonRegister?: (handler: (() => void) | null) => void;
}
