import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PdfLoadStatus } from "../../../types/pdf";
import type { RetrievedPdfDocument, RetrievedPdfMeta } from "../../../types/pdfRetrieval";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "../constants/viewerConstants";
import { logStageGeometryMismatch } from "../utils/viewerDiagnostics";
import { clampZoom } from "../utils/viewerStatus";

GlobalWorkerOptions.workerSrc = pdfWorker;

interface UsePdfDocumentOptions {
  retrievedPdfDocument: RetrievedPdfDocument | null;
}

export interface PdfDocumentState {
  pdfDoc: PDFDocumentProxy | null;
  documentMeta: RetrievedPdfMeta | null;
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
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  canvasContainerRef: MutableRefObject<HTMLDivElement | null>;
  pageStageRef: MutableRefObject<HTMLDivElement | null>;
  movePage: (direction: -1 | 1) => void;
  handlePageInput: (nextPage: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleFitToWidth: () => Promise<void>;
  setZoom: Dispatch<SetStateAction<number>>;
}

export function usePdfDocument({
  retrievedPdfDocument
}: UsePdfDocumentOptions): PdfDocumentState & PdfDocumentActions {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const pageStageRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [documentMeta, setDocumentMeta] = useState<RetrievedPdfMeta | null>(null);
  const [loadStatus, setLoadStatus] = useState<PdfLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const loadSequenceRef = useRef(0);

  const clearCanvasSurface = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      context?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    }
    setPageWidth(0);
    setPageHeight(0);
  }, []);

  useEffect(() => {
    const nextSequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = nextSequence;

    if (!retrievedPdfDocument) {
      clearCanvasSurface();
      setPdfDoc((previousDoc) => {
        if (previousDoc) {
          previousDoc.destroy().catch(() => {
            // Ignore cleanup failures while resetting the viewer.
          });
        }
        return null;
      });
      setDocumentMeta(null);
      setTotalPages(0);
      setCurrentPage(1);
      setZoom(1);
      setPageWidth(0);
      setPageHeight(0);
      setErrorMessage(undefined);
      setLoadStatus("idle");
      return;
    }

    let cancelled = false;
    setLoadStatus("loading");
    setErrorMessage(undefined);

    const initialize = async () => {
      const data = await retrievedPdfDocument.blob.arrayBuffer();
      const loadingTask = getDocument({ data: new Uint8Array(data) });
      const nextDoc = await loadingTask.promise;

      if (cancelled || loadSequenceRef.current !== nextSequence) {
        await nextDoc.destroy().catch(() => {
          // Ignore cleanup failures for stale retrieval responses.
        });
        return;
      }

      setPdfDoc((previousDoc) => {
        if (previousDoc) {
          previousDoc.destroy().catch(() => {
            // Ignore cleanup failures while replacing a document.
          });
        }
        return nextDoc;
      });
      setDocumentMeta(retrievedPdfDocument.meta);
      setTotalPages(nextDoc.numPages);
      setCurrentPage(1);
      setZoom(1);
      setLoadStatus("ready");
    };

    initialize().catch(() => {
      if (!cancelled && loadSequenceRef.current === nextSequence) {
        setLoadStatus("error");
        setErrorMessage("PDF loading failed after retrieval.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clearCanvasSurface, retrievedPdfDocument]);

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
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
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
        clearCanvasSurface();
      }
    });

    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [clearCanvasSurface, currentPage, pdfDoc, zoom]);

  useEffect(() => {
    const stage = pageStageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas || pageWidth <= 0 || pageHeight <= 0) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    logStageGeometryMismatch({
      page: currentPage,
      zoom,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
      canvasCssWidth: canvasRect.width,
      canvasCssHeight: canvasRect.height,
      canvasPixelWidth: canvas.width,
      canvasPixelHeight: canvas.height
    });
  }, [currentPage, pageHeight, pageWidth, zoom]);

  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => {
          // Ignore cleanup failures during unmount.
        });
      }
    };
  }, [pdfDoc]);

  const movePage = useCallback(
    (direction: -1 | 1) => {
      setCurrentPage((page) => {
        const next = page + direction;
        return Math.min(Math.max(next, 1), totalPages || 1);
      });
    },
    [totalPages]
  );

  const handlePageInput = useCallback(
    (nextPage: number) => {
      if (!Number.isFinite(nextPage)) {
        return;
      }
      setCurrentPage(Math.min(Math.max(Math.trunc(nextPage), 1), totalPages || 1));
    },
    [totalPages]
  );

  const handleFitToWidth = useCallback(async () => {
    if (!pdfDoc || !canvasContainerRef.current) {
      return;
    }

    const container = canvasContainerRef.current;
    const containerStyles = window.getComputedStyle(container);
    const horizontalPadding =
      Number.parseFloat(containerStyles.paddingLeft || "0") +
      Number.parseFloat(containerStyles.paddingRight || "0");

    const page = await pdfDoc.getPage(currentPage);
    const viewportAtOne = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(container.clientWidth - horizontalPadding, 1);
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
      pdfDoc,
      documentMeta,
      loadStatus,
      errorMessage,
      currentPage,
      totalPages,
      zoom,
      pageWidth,
      pageHeight,
      hasPdf: Boolean(pdfDoc),
      movePage,
      handlePageInput,
      handleZoomIn,
      handleZoomOut,
      handleFitToWidth,
      setZoom
    }),
    [
      currentPage,
      documentMeta,
      errorMessage,
      handleFitToWidth,
      handlePageInput,
      handleZoomIn,
      handleZoomOut,
      loadStatus,
      pageHeight,
      pageWidth,
      pdfDoc,
      totalPages,
      zoom
    ]
  );
}
