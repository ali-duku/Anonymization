import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEventHandler,
  type PointerEvent as ReactPointerEvent
} from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type {
  NormalizedBbox,
  OverlayDocument,
  OverlayRegion,
  OverlaySaveState
} from "../../types/overlay";
import type { PersistedViewerState, PdfLoadStatus, StoredPdfRecord } from "../../types/pdf";
import type { StorageService } from "../../types/services";
import {
  computeNormalizedMinimumSize,
  moveBboxWithinPage,
  resizeBboxWithinPage,
  type NormalizedMinimumSize,
  type NormalizedPoint,
  type ResizeHandle
} from "../overlayGeometry";
import { REGION_LABEL_OPTIONS } from "../regionLabelOptions";

GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerTabProps {
  storageService: StorageService;
  overlayDocument?: OverlayDocument | null;
  overlaySaveState?: OverlaySaveState | null;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}

interface LabelPalette {
  border: string;
  fillMatched: string;
  fillUnmatched: string;
  buttonBackground: string;
  buttonText: string;
}

interface OverlayDraftState {
  regionId: string;
  pageNumber: number;
  bbox: NormalizedBbox;
}

type OverlayInteractionMode = "drag" | ResizeHandle;
type TextDirection = "rtl" | "ltr";

interface OverlayInteractionState {
  pointerId: number;
  regionId: string;
  pageNumber: number;
  mode: OverlayInteractionMode;
  startPointer: NormalizedPoint;
  startBbox: NormalizedBbox;
  minimumSize: NormalizedMinimumSize;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const RESIZE_HANDLES: ResizeHandle[] = ["nw", "ne", "sw", "se"];
const BBOX_CHANGE_EPSILON = 0.0005;

const LABEL_HUES: Record<string, number> = {
  text: 196,
  "section-header": 154,
  "page-footer": 46,
  picture: 302,
  "list-item": 270,
  "page-header": 112,
  table: 18,
  formula: 338
};

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function hasBboxChanged(previous: NormalizedBbox, next: NormalizedBbox): boolean {
  return (
    Math.abs(previous.x1 - next.x1) > BBOX_CHANGE_EPSILON ||
    Math.abs(previous.y1 - next.y1) > BBOX_CHANGE_EPSILON ||
    Math.abs(previous.x2 - next.x2) > BBOX_CHANGE_EPSILON ||
    Math.abs(previous.y2 - next.y2) > BBOX_CHANGE_EPSILON
  );
}

function buildStatusText(loadStatus: PdfLoadStatus, message?: string): string {
  if (loadStatus === "loading") {
    return "Loading PDF...";
  }
  if (loadStatus === "error") {
    return message ?? "Unable to load PDF.";
  }
  return "";
}

function hashLabelToHue(label: string): number {
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
}

function buildPalette(label: string): LabelPalette {
  const normalized = label.trim().toLowerCase();
  const hue = LABEL_HUES[normalized] ?? hashLabelToHue(normalized || "unknown");
  return {
    border: `hsl(${hue} 78% 62%)`,
    fillMatched: `hsl(${hue} 78% 62% / 0.2)`,
    fillUnmatched: `hsl(${hue} 78% 62% / 0.04)`,
    buttonBackground: `hsl(${hue} 88% 58% / 0.95)`,
    buttonText: "#08111a"
  };
}

function toOverlayStyle(region: OverlayRegion, bbox: NormalizedBbox): CSSProperties {
  const palette = buildPalette(region.label);
  const x1 = clamp01(bbox.x1);
  const y1 = clamp01(bbox.y1);
  const x2 = clamp01(bbox.x2);
  const y2 = clamp01(bbox.y2);

  const left = Math.min(x1, x2) * 100;
  const top = Math.min(y1, y2) * 100;
  const width = Math.max(0.01, Math.abs(x2 - x1) * 100);
  const height = Math.max(0.01, Math.abs(y2 - y1) * 100);

  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    borderColor: palette.border,
    backgroundColor: region.matchedContent ? palette.fillMatched : palette.fillUnmatched
  };
}

function resolveNextBbox(
  interaction: OverlayInteractionState,
  currentPointer: NormalizedPoint
): NormalizedBbox {
  const delta = {
    x: currentPointer.x - interaction.startPointer.x,
    y: currentPointer.y - interaction.startPointer.y
  };

  if (interaction.mode === "drag") {
    return moveBboxWithinPage(interaction.startBbox, delta);
  }

  return resizeBboxWithinPage(
    interaction.startBbox,
    delta,
    interaction.mode,
    interaction.minimumSize
  );
}

function applyRegionBbox(
  document: OverlayDocument,
  pageNumber: number,
  regionId: string,
  bbox: NormalizedBbox
): OverlayDocument {
  let regionChanged = false;

  const nextPages = document.pages.map((page) => {
    if (page.pageNumber !== pageNumber) {
      return page;
    }

    const nextRegions = page.regions.map((region) => {
      if (region.id !== regionId) {
        return region;
      }

      regionChanged = true;
      return {
        ...region,
        bbox
      };
    });

    return regionChanged
      ? {
          ...page,
          regions: nextRegions
        }
      : page;
  });

  return regionChanged
    ? {
        pages: nextPages
      }
    : document;
}

function applyRegionEdits(
  document: OverlayDocument,
  pageNumber: number,
  regionId: string,
  edits: { bbox?: NormalizedBbox; label?: string; text?: string }
): OverlayDocument {
  let regionChanged = false;

  const nextPages = document.pages.map((page) => {
    if (page.pageNumber !== pageNumber) {
      return page;
    }

    const nextRegions = page.regions.map((region) => {
      if (region.id !== regionId) {
        return region;
      }

      regionChanged = true;
      return {
        ...region,
        ...(edits.bbox ? { bbox: edits.bbox } : {}),
        ...(typeof edits.label === "string" ? { label: edits.label } : {}),
        ...(typeof edits.text === "string" ? { text: edits.text } : {})
      };
    });

    return regionChanged
      ? {
          ...page,
          regions: nextRegions
        }
      : page;
  });

  return regionChanged
    ? {
        pages: nextPages
      }
    : document;
}

export function PdfViewerTab({
  storageService,
  overlayDocument = null,
  overlaySaveState = null,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: PdfViewerTabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const pageStageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draftRef = useRef<OverlayDraftState | null>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [recordMeta, setRecordMeta] = useState<StoredPdfRecord | null>(null);
  const [loadStatus, setLoadStatus] = useState<PdfLoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [dialogDraftLabel, setDialogDraftLabel] = useState("");
  const [dialogDraftText, setDialogDraftText] = useState("");
  const [dialogTextDirection, setDialogTextDirection] = useState<TextDirection>("rtl");
  const [interaction, setInteraction] = useState<OverlayInteractionState | null>(null);
  const [draft, setDraft] = useState<OverlayDraftState | null>(null);

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
  }, [storageService]);

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
  }, [pdfDoc, currentPage, zoom]);

  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy().catch(() => {
          // Ignore cleanup failures during unmount.
        });
      }
    };
  }, [pdfDoc]);

  useEffect(() => {
    if (!recordMeta || !pdfDoc || loadStatus !== "ready") {
      return;
    }

    const state: PersistedViewerState = { currentPage, zoom };
    storageService.saveViewerState(state).catch(() => {
      // Avoid blocking the viewer if persistence fails.
    });
  }, [currentPage, loadStatus, pdfDoc, recordMeta, storageService, zoom]);

  useEffect(() => {
    setActiveRegionId(null);
    setDialogDraftLabel("");
    setDialogDraftText("");
    setDialogTextDirection("rtl");
    setInteraction(null);
    setDraft(null);
    draftRef.current = null;
  }, [overlayDocument, currentPage]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const loadPdfFromBlob = async (
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
    const safeZoom = clampZoom(stateFromStorage.zoom);

    setPdfDoc(nextDoc);
    setTotalPages(nextDoc.numPages);
    setCurrentPage(safePage);
    setZoom(safeZoom);
    setLoadStatus("ready");
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (event) => {
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
  };

  const movePage = (direction: -1 | 1) => {
    setCurrentPage((page) => {
      const next = page + direction;
      return Math.min(Math.max(next, 1), totalPages || 1);
    });
  };

  const handlePageInput: ChangeEventHandler<HTMLInputElement> = (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) {
      return;
    }
    setCurrentPage(Math.min(Math.max(Math.trunc(value), 1), totalPages || 1));
  };

  const handleFitToWidth = async () => {
    if (!pdfDoc || !canvasContainerRef.current) {
      return;
    }
    const page = await pdfDoc.getPage(currentPage);
    const viewportAtOne = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(canvasContainerRef.current.clientWidth - 24, 320);
    const fittedZoom = clampZoom(availableWidth / viewportAtOne.width);
    setZoom(fittedZoom);
  };

  const getNormalizedPointer = (clientX: number, clientY: number): NormalizedPoint | null => {
    const stage = pageStageRef.current;
    if (!stage) {
      return null;
    }

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const normalizedX = (clientX - rect.left) / rect.width;
    const normalizedY = (clientY - rect.top) / rect.height;
    if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
      return null;
    }

    return {
      x: clamp01(normalizedX),
      y: clamp01(normalizedY)
    };
  };

  const beginInteraction = (
    event: ReactPointerEvent<HTMLElement>,
    region: OverlayRegion,
    mode: OverlayInteractionMode
  ) => {
    if (!overlayDocument || pageWidth <= 0 || pageHeight <= 0) {
      return;
    }

    const startPointer = getNormalizedPointer(event.clientX, event.clientY);
    if (!startPointer) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    setInteraction({
      pointerId: event.pointerId,
      regionId: region.id,
      pageNumber: region.pageNumber,
      mode,
      startPointer,
      startBbox: region.bbox,
      minimumSize: computeNormalizedMinimumSize(pageWidth, pageHeight, 10)
    });
    setDraft({
      regionId: region.id,
      pageNumber: region.pageNumber,
      bbox: region.bbox
    });
  };

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== interaction.pointerId) {
        return;
      }

      const pointer = getNormalizedPointer(event.clientX, event.clientY);
      if (!pointer) {
        return;
      }

      const nextBbox = resolveNextBbox(interaction, pointer);
      setDraft({
        regionId: interaction.regionId,
        pageNumber: interaction.pageNumber,
        bbox: nextBbox
      });
    };

    const handleInteractionEnd = (event: PointerEvent) => {
      if (event.pointerId !== interaction.pointerId) {
        return;
      }

      const nextBbox =
        draftRef.current?.regionId === interaction.regionId
          ? draftRef.current.bbox
          : interaction.startBbox;
      const bboxChanged = hasBboxChanged(interaction.startBbox, nextBbox);

      if (bboxChanged && overlayDocument && onOverlayDocumentSaved) {
        onOverlayEditStarted?.();
        const nextDocument = applyRegionBbox(
          overlayDocument,
          interaction.pageNumber,
          interaction.regionId,
          nextBbox
        );
        onOverlayDocumentSaved(nextDocument);
      }

      setInteraction(null);
      setDraft(null);
      draftRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handleInteractionEnd);
    window.addEventListener("pointercancel", handleInteractionEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handleInteractionEnd);
      window.removeEventListener("pointercancel", handleInteractionEnd);
    };
  }, [interaction, onOverlayEditStarted, overlayDocument, onOverlayDocumentSaved]);

  const statusText = buildStatusText(loadStatus, errorMessage);
  const hasPdf = Boolean(pdfDoc);
  const currentPageOverlays = useMemo(
    () => overlayDocument?.pages.find((page) => page.pageNumber === currentPage)?.regions ?? [],
    [currentPage, overlayDocument]
  );
  const visiblePageOverlays = useMemo(() => {
    if (!draft || draft.pageNumber !== currentPage) {
      return currentPageOverlays;
    }

    return currentPageOverlays.map((region) =>
      region.id === draft.regionId
        ? {
            ...region,
            bbox: draft.bbox
          }
        : region
    );
  }, [currentPage, currentPageOverlays, draft]);
  const activeRegion = useMemo(() => {
    if (!activeRegionId || !overlayDocument) {
      return null;
    }

    for (const page of overlayDocument.pages) {
      const region = page.regions.find((item) => item.id === activeRegionId);
      if (region) {
        return region;
      }
    }

    return null;
  }, [activeRegionId, overlayDocument]);
  const hasDialogChanges = useMemo(() => {
    if (!activeRegion) {
      return false;
    }

    return (
      dialogDraftLabel !== activeRegion.label ||
      dialogDraftText !== (activeRegion.text || "")
    );
  }, [activeRegion, dialogDraftLabel, dialogDraftText]);
  const dialogLabelOptions = useMemo(() => {
    const known = REGION_LABEL_OPTIONS.includes(dialogDraftLabel as (typeof REGION_LABEL_OPTIONS)[number]);
    if (!dialogDraftLabel || known) {
      return REGION_LABEL_OPTIONS;
    }
    return [dialogDraftLabel, ...REGION_LABEL_OPTIONS];
  }, [dialogDraftLabel]);
  const openRegionEditor = useCallback((region: OverlayRegion) => {
    setActiveRegionId(region.id);
    setDialogDraftLabel(region.label);
    setDialogDraftText(region.text || "");
    setDialogTextDirection("rtl");
  }, []);
  const closeRegionEditor = useCallback(() => {
    if (hasDialogChanges) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in this region. Discard them?"
      );
      if (!shouldDiscard) {
        return;
      }
    }

    setActiveRegionId(null);
    setDialogDraftLabel("");
    setDialogDraftText("");
    setDialogTextDirection("rtl");
  }, [hasDialogChanges]);
  const handleResetRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }
    setDialogDraftLabel(activeRegion.label);
    setDialogDraftText(activeRegion.text || "");
  }, [activeRegion]);
  const handleSaveRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }

    const nextLabel = dialogDraftLabel.trim() || activeRegion.label;
    const nextText = dialogDraftText;

    if (overlayDocument && onOverlayDocumentSaved) {
      onOverlayEditStarted?.();
      const nextDocument = applyRegionEdits(overlayDocument, activeRegion.pageNumber, activeRegion.id, {
        label: nextLabel,
        text: nextText
      });
      onOverlayDocumentSaved(nextDocument);
    }

    setActiveRegionId(null);
    setDialogDraftLabel("");
    setDialogDraftText("");
    setDialogTextDirection("rtl");
  }, [
    activeRegion,
    dialogDraftLabel,
    dialogDraftText,
    onOverlayDocumentSaved,
    onOverlayEditStarted,
    overlayDocument
  ]);
  useEffect(() => {
    if (!activeRegionId) {
      return;
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      closeRegionEditor();
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [activeRegionId, closeRegionEditor]);
  const saveIndicatorText = useMemo(() => {
    if (!overlayDocument || !overlaySaveState) {
      return "";
    }
    if (overlaySaveState.isSaving) {
      return "Saving...";
    }
    if (overlaySaveState.isSaved) {
      if (overlaySaveState.lastSavedAt) {
        return `Saved ${new Date(overlaySaveState.lastSavedAt).toLocaleTimeString()}`;
      }
      return "Saved";
    }
    return "Unsaved";
  }, [overlayDocument, overlaySaveState]);
  const recordSummary = recordMeta
    ? `${recordMeta.fileName} | ${(recordMeta.fileSize / 1024 / 1024).toFixed(2)} MB | ${new Date(
        recordMeta.updatedAt
      ).toLocaleString()}`
    : "";

  return (
    <section className="panel viewer-panel fade-in" aria-label="Viewer tab">
      <header className="viewer-topline">
        <h2>Viewer</h2>
        <div className="viewer-toolbar">
          <button type="button" className="action-button" onClick={handleFilePick}>
            {hasPdf ? "Replace PDF" : "Upload PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden-input"
          />

          <div className="toolbar-group">
            <button type="button" className="icon-button" onClick={() => movePage(-1)} disabled={!hasPdf}>
              Prev
            </button>
            <label className="compact-field">
              Page
              <input
                type="number"
                min={1}
                max={Math.max(1, totalPages)}
                value={currentPage}
                onChange={handlePageInput}
                disabled={!hasPdf}
              />
            </label>
            <span className="total-pages">/ {totalPages || 0}</span>
            <button type="button" className="icon-button" onClick={() => movePage(1)} disabled={!hasPdf}>
              Next
            </button>
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              className="icon-button"
              onClick={() => setZoom((prev) => clampZoom(prev - ZOOM_STEP))}
              disabled={!hasPdf}
            >
              -
            </button>
            <span className="zoom-label">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setZoom((prev) => clampZoom(prev + ZOOM_STEP))}
              disabled={!hasPdf}
            >
              +
            </button>
            <button type="button" className="icon-button" onClick={handleFitToWidth} disabled={!hasPdf}>
              Fit Width
            </button>
          </div>

          {recordMeta && <span className="viewer-inline-meta">{recordSummary}</span>}
          {overlayDocument && hasPdf && (
            <span className="viewer-inline-meta">
              Page {currentPage}: {visiblePageOverlays.length} overlays
            </span>
          )}
          {saveIndicatorText && (
            <span
              className={`viewer-inline-meta viewer-save-indicator ${
                overlaySaveState?.isSaving ? "saving" : "saved"
              }`}
            >
              {saveIndicatorText}
            </span>
          )}
        </div>
      </header>

      {!hasPdf && loadStatus !== "loading" && (
        <div className="empty-view">
          <h3>No PDF uploaded yet</h3>
          <p>Upload one PDF to start. This tool restores only your most recently uploaded file.</p>
          <button type="button" className="action-button" onClick={handleFilePick}>
            Upload PDF
          </button>
        </div>
      )}

      {statusText && (
        <p className={`status-line ${loadStatus === "error" ? "error" : ""}`} role="status">
          {statusText}
        </p>
      )}

      <div ref={canvasContainerRef} className={`canvas-shell ${hasPdf ? "active" : ""}`}>
        <div
          ref={pageStageRef}
          className="page-stage"
          style={
            pageWidth > 0 && pageHeight > 0
              ? {
                  width: `${pageWidth}px`,
                  height: `${pageHeight}px`
                }
              : undefined
          }
        >
          <canvas ref={canvasRef} className="pdf-canvas" />
          {hasPdf && visiblePageOverlays.length > 0 && (
            <div className="overlay-layer" aria-label="Page overlays">
              {visiblePageOverlays.map((region) => {
                const palette = buildPalette(region.label);
                const isEditing = interaction?.regionId === region.id;

                return (
                  <div
                    key={region.id}
                    className={`overlay-box ${region.matchedContent ? "matched" : "unmatched"} ${
                      isEditing ? "editing" : ""
                    }`}
                    style={toOverlayStyle(region, region.bbox)}
                  >
                    <div
                      className="overlay-drag-surface"
                      onPointerDown={(event) => beginInteraction(event, region, "drag")}
                      onDoubleClick={() => openRegionEditor(region)}
                      aria-hidden="true"
                    />
                    {RESIZE_HANDLES.map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        className={`overlay-resize-handle ${handle}`}
                        onPointerDown={(event) => beginInteraction(event, region, handle)}
                        onClick={(event) => event.preventDefault()}
                        aria-label={`Resize ${region.label} region (${handle.toUpperCase()})`}
                      />
                    ))}
                    <button
                      type="button"
                      className="overlay-edit-button"
                      style={{
                        borderColor: palette.border,
                        background: palette.buttonBackground,
                        color: palette.buttonText
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => openRegionEditor(region)}
                      aria-label={`Edit ${region.label} region`}
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {activeRegion && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="region-editor-title">
          <div className="modal-card overlay-dialog-card">
            <header className="modal-header">
              <h2 id="region-editor-title">Edit Region</h2>
              <button
                type="button"
                className="ghost-button dialog-close-button"
                onClick={closeRegionEditor}
                aria-label="Close region editor"
              >
                <span className="dialog-close-glyph" aria-hidden="true" />
              </button>
            </header>

            <div className="overlay-dialog-body">
              <label className="overlay-dialog-text-label" htmlFor="overlay-label-select">
                Label
              </label>
              <select
                id="overlay-label-select"
                className="overlay-dialog-select"
                value={dialogDraftLabel}
                onChange={(event) => setDialogDraftLabel(event.currentTarget.value)}
              >
                {dialogLabelOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="overlay-dialog-text-header">
                <label className="overlay-dialog-text-label" htmlFor="overlay-text-content">
                  Text
                </label>
                <button
                  type="button"
                  className="ghost-button overlay-dialog-direction-toggle"
                  onClick={() =>
                    setDialogTextDirection((prev) => (prev === "rtl" ? "ltr" : "rtl"))
                  }
                >
                  {dialogTextDirection === "rtl" ? "Switch to LTR" : "Switch to RTL"}
                </button>
              </div>
              <textarea
                id="overlay-text-content"
                className="overlay-dialog-text"
                dir={dialogTextDirection}
                value={dialogDraftText}
                onChange={(event) => setDialogDraftText(event.currentTarget.value)}
              />

              <details className="overlay-metadata">
                <summary>Metadata</summary>
                <dl>
                  <div>
                    <dt>Page</dt>
                    <dd>{activeRegion.metadata.pageNumber ?? "N/A"}</dd>
                  </div>
                  <div>
                    <dt>Region ID</dt>
                    <dd>{activeRegion.metadata.regionId ?? "N/A"}</dd>
                  </div>
                </dl>
              </details>
            </div>

            <div className="overlay-dialog-actions">
              <button type="button" className="action-button secondary" onClick={handleSaveRegionEditor}>
                Save
              </button>
              <button type="button" className="action-button secondary" onClick={handleResetRegionEditor}>
                Reset
              </button>
              <button type="button" className="action-button secondary" onClick={() => undefined}>
                Delete
              </button>
              <button type="button" className="action-button" onClick={closeRegionEditor}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
