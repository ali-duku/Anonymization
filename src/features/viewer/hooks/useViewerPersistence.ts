import { useEffect } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PdfLoadStatus, StoredPdfRecord } from "../../../types/pdf";
import type { StorageService } from "../../../types/services";

interface UseViewerPersistenceOptions {
  storageService: StorageService;
  recordMeta: StoredPdfRecord | null;
  pdfDoc: PDFDocumentProxy | null;
  loadStatus: PdfLoadStatus;
  currentPage: number;
  zoom: number;
}

export function useViewerPersistence({
  storageService,
  recordMeta,
  pdfDoc,
  loadStatus,
  currentPage,
  zoom
}: UseViewerPersistenceOptions): void {
  useEffect(() => {
    if (!recordMeta || !pdfDoc || loadStatus !== "ready") {
      return;
    }

    storageService.saveViewerState({ currentPage, zoom }).catch(() => {
      // Avoid blocking the viewer if persistence fails.
    });
  }, [currentPage, loadStatus, pdfDoc, recordMeta, storageService, zoom]);
}
