import type { ChangeEventHandler, RefObject } from "react";
import type { OverlayDocument, OverlaySaveState } from "../../../../types/overlay";
import type { RetrievedPdfDocument } from "../../../../types/pdfRetrieval";
import type { PdfRetrievalStatus } from "../../../pdf/hooks/usePdfRetrieval";

export interface PdfViewerTabProps {
  retrievedPdfDocument: RetrievedPdfDocument | null;
  retrievalInputValue: string;
  retrievalStatus: PdfRetrievalStatus;
  retrievalErrorMessage: string | null;
  canRetryRetrieval: boolean;
  onRetrievalInputChange: (value: string) => void;
  onRetrieveDocument: () => void;
  onResetRetrieval: () => void;
  onRetryRetrieval: () => void;
  manualFileInputRef?: RefObject<HTMLInputElement>;
  onManualFilePick?: () => void;
  onManualFileChange?: ChangeEventHandler<HTMLInputElement>;
  manualUploadStatusText?: string;
  manualUploadStatusTone?: "error" | "success" | "neutral";
  overlayDocument?: OverlayDocument | null;
  overlaySaveState?: OverlaySaveState | null;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}
