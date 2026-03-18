export type PdfLoadStatus = "idle" | "loading" | "ready" | "error";

/**
 * Runtime viewer state used by UI controls and status indicators.
 */
export interface PdfViewerState {
  currentPage: number;
  zoom: number;
  totalPages: number;
  loadStatus: PdfLoadStatus;
  errorMessage?: string;
}
