import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PersistedViewerState, PdfLoadStatus, StoredPdfRecord } from "../../../types/pdf";
import type { StorageService } from "../../../types/services";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "../constants/viewerConstants";
import { clampZoom } from "../utils/viewerStatus";

GlobalWorkerOptions.workerSrc = pdfWorker;

interface UsePdfDocumentOptions {
  storageService: StorageService;
}

export interface PdfDocumentState {
  pdfDoc: PDFDocumentProxy | null;
  recordMeta: StoredPdfRecord | null;
  loadStatus: PdfLoadStatus;
  errorMessage?: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  pageWidth: number;
  pageHeight: number;
  hasPdf: boolean;
}

export interface PdfDocumentActions {
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  canvasContainerRef: MutableRefObject<HTMLDivElement | null>;
  pageStageRef: MutableRefObject<HTMLDivElement | null>;
  handleFilePick: () => void;
  handleFileChange: ChangeEventHandler<HTMLInputElement>;
  movePage: (direction: -1 | 1) => void;
  handlePageInput: ChangeEventHandler<HTMLInputElement>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleFitToWidth: () => Promise<void>;
  setZoom: Dispatch<SetStateAction<number>>;
}

export function usePdfDocument({ storageService }: UsePdfDocumentOptions): PdfDocumentState & PdfDocumentActions {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const pageStageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [recordMeta, setRecordMeta] = useState<StoredPdfRecord | null>(null);
  const [loadStatus, setLoadStatus] = useState<PdfLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  const loadPdfFromBlob = useCallback(
    async (
      blob: Blob,
      preferredState?: PersistedViewerState,
      shouldContinue: () => boolean = () => true
    ) => {
      setLoadStatus("loading");
      setErrorMessage(undefined);

      const data = await blob.arrayBuffer();
      const loadingTask = getDocument({ data: new Uint8Array(data) });
      const nextDoc = await loadingTask.promise;
      if (!shouldContinue()) {
        nextDoc.destroy();
        return;
      }

      const stateFromStorage = preferredState ?? (await storageService.loadViewerState()) ?? {
        currentPage: 1,
        zoom: 1
      };

      const safePage = Math.min(nextDoc.numPages, Math.max(1, stateFromStorage.currentPage));
      const safeZoom = clampZoom(stateFromStorage.zoom, MIN_ZOOM, MAX_ZOOM);

      setPdfDoc(nextDoc);
      setTotalPages(nextDoc.numPages);
      setCurrentPage(safePage);
      setZoom(safeZoom);
      setLoadStatus("ready");
    },
    [storageService]
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setLoadStatus("loading");
      const record = await storageService.loadPdfRecord();

      if (cancelled) {
        return;
      }

      if (!record) {
        setLoadStatus("idle");
        return;
      }

      setRecordMeta(record);
      await loadPdfFromBlob(record.pdfBlob, record.viewerState, () => !cancelled);
    };

    initialize().catch(() => {
      if (!cancelled) {
        setLoadStatus("error");
        setErrorMessage("Failed to restore the last uploaded PDF.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadPdfFromBlob, storageService]);

  useEffect(() => {
    if (!pdfDoc) {
      return;
    }

    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(currentPage);
      if (cancelled) {
        return;
      }

      const viewport = page.getViewport({ scale: zoom });
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const width = Math.floor(viewport.width);
      const height = Math.floor(viewport.height);
      canvas.width = width;
      canvas.height = height;
      setPageWidth(width);
      setPageHeight(height);

      renderTask = page.render({ canvas, canvasContext: context, viewport });
      await renderTask.promise;
    };

    renderPage().catch((error: unknown) => {
      const errorName = typeof error === "object" && error !== null ? (error as { name?: string }).name : "";
      if (errorName !== "RenderingCancelledException") {
        setLoadStatus("error");
        setErrorMessage("PDF rendering failed.");
      }
    });

    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [currentPage, pdfDoc, zoom]);

  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => {
          // Ignore cleanup failures during unmount.
        });
      }
    };
  }, [pdfDoc]);

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setLoadStatus("error");
        setErrorMessage("Only PDF files are supported.");
        return;
      }

      try {
        const record = await storageService.replacePdf(file, { currentPage: 1, zoom: 1 });
        setRecordMeta(record);
        await loadPdfFromBlob(record.pdfBlob, record.viewerState);
      } catch {
        setLoadStatus("error");
        setErrorMessage("Could not store and open this PDF.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [loadPdfFromBlob, storageService]
  );

  const movePage = useCallback(
    (direction: -1 | 1) => {
      setCurrentPage((page) => {
        const next = page + direction;
        return Math.min(Math.max(next, 1), totalPages || 1);
      });
    },
    [totalPages]
  );

  const handlePageInput: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const value = Number(event.target.value);
      if (!Number.isFinite(value)) {
        return;
      }
      setCurrentPage(Math.min(Math.max(Math.trunc(value), 1), totalPages || 1));
    },
    [totalPages]
  );

  const handleFitToWidth = useCallback(async () => {
    if (!pdfDoc || !canvasContainerRef.current) {
      return;
    }

    const page = await pdfDoc.getPage(currentPage);
    const viewportAtOne = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(canvasContainerRef.current.clientWidth - 24, 320);
    const fittedZoom = clampZoom(availableWidth / viewportAtOne.width, MIN_ZOOM, MAX_ZOOM);
    setZoom(fittedZoom);
  }, [currentPage, pdfDoc]);

  const handleZoomIn = useCallback(() => {
    setZoom((previous) => clampZoom(previous + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((previous) => clampZoom(previous - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  }, []);

  return useMemo(
    () => ({
      canvasRef,
      canvasContainerRef,
      pageStageRef,
      fileInputRef,
      pdfDoc,
      recordMeta,
      loadStatus,
      errorMessage,
      currentPage,
      totalPages,
      zoom,
      pageWidth,
      pageHeight,
      hasPdf: Boolean(pdfDoc),
      handleFilePick,
      handleFileChange,
      movePage,
      handlePageInput,
      handleZoomIn,
      handleZoomOut,
      handleFitToWidth,
      setZoom
    }),
    [
      currentPage,
      errorMessage,
      handleFileChange,
      handleFilePick,
      handleFitToWidth,
      handlePageInput,
      handleZoomIn,
      handleZoomOut,
      loadStatus,
      pageHeight,
      pageWidth,
      pdfDoc,
      recordMeta,
      totalPages,
      zoom
    ]
  );
}
