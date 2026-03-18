import type { PdfRetrievalStatus } from "../../../pdf/hooks/usePdfRetrieval";

export interface ViewerToolbarProps {
  hasPdf: boolean;
  currentPage: number;
  totalPages: number;
  zoom: number;
  isCreateMode: boolean;
  canCreateBbox: boolean;
  recordSummary: string;
  overlayCount: number;
  showOverlayCount: boolean;
  saveIndicatorText: string;
  isSaving: boolean;
  retrievalInputValue: string;
  retrievalStatus: PdfRetrievalStatus;
  retrievalStatusText: string;
  canRetryRetrieval: boolean;
  onRetrievalInputChange: (value: string) => void;
  onRetrieveDocument: () => void;
  onResetRetrieval: () => void;
  onRetryRetrieval: () => void;
  onMovePage: (direction: -1 | 1) => void;
  onPageInput: (nextPage: number) => void;
  onToggleCreateMode: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitToWidth: () => void;
}
