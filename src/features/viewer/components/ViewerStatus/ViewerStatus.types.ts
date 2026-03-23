import type { PdfLoadStatus } from "../../../../types/pdf";

export interface ViewerStatusProps {
  hasPdf: boolean;
  loadStatus: PdfLoadStatus;
  statusText: string;
  onManualFilePick?: () => void;
}
