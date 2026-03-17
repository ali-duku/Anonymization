import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type CSSProperties,
  type ChangeEventHandler,
  type PointerEvent as ReactPointerEvent
} from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type {
  NormalizedBbox,
  OverlayDocument,
  OverlayEntitySpan,
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
import {
  ANONYMIZATION_ENTITY_LABELS,
  DEFAULT_ANONYMIZATION_ENTITY_LABEL,
  buildEntityPalette,
  coerceEntityLabel,
  hasEntityOverlap,
  normalizeEntitySpansForText,
  sortEntitySpans
} from "../../shared/anonymizationEntities";

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

interface CreateInteractionState {
  pointerId: number;
  pageNumber: number;
  startPointer: NormalizedPoint;
  minimumSize: NormalizedMinimumSize;
}

interface PendingSelectionRange {
  start: number;
  end: number;
  text: string;
}

interface SpanEditorDraft {
  index: number;
  entity: string;
  anchorX: number;
  anchorY: number;
}

interface CreateDraftState {
  pageNumber: number;
  bbox: NormalizedBbox;
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
  edits: { bbox?: NormalizedBbox; label?: string; text?: string; entities?: OverlayEntitySpan[] }
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
        ...(typeof edits.text === "string" ? { text: edits.text } : {}),
        ...(Array.isArray(edits.entities) ? { entities: edits.entities } : {})
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

function removeRegionFromDocument(
  document: OverlayDocument,
  pageNumber: number,
  regionId: string
): OverlayDocument {
  let regionChanged = false;

  const nextPages = document.pages.map((page) => {
    if (page.pageNumber !== pageNumber) {
      return page;
    }

    const nextRegions = page.regions.filter((region) => region.id !== regionId);
    if (nextRegions.length !== page.regions.length) {
      regionChanged = true;
      return {
        ...page,
        regions: nextRegions
      };
    }

    return page;
  });

  return regionChanged
    ? {
        pages: nextPages
      }
    : document;
}

function addRegionToDocument(
  document: OverlayDocument,
  pageNumber: number,
  region: OverlayRegion
): OverlayDocument {
  const nextPages = document.pages.map((page) =>
    page.pageNumber === pageNumber
      ? {
          ...page,
          regions: [...page.regions, region]
        }
      : page
  );
  return {
    pages: nextPages
  };
}

function resolveCreateBbox(startPointer: NormalizedPoint, currentPointer: NormalizedPoint): NormalizedBbox {
  return {
    x1: Math.min(startPointer.x, currentPointer.x),
    y1: Math.min(startPointer.y, currentPointer.y),
    x2: Math.max(startPointer.x, currentPointer.x),
    y2: Math.max(startPointer.y, currentPointer.y)
  };
}

function isBboxLargeEnough(bbox: NormalizedBbox, minimumSize: NormalizedMinimumSize): boolean {
  return bbox.x2 - bbox.x1 >= minimumSize.width && bbox.y2 - bbox.y1 >= minimumSize.height;
}

function buildNextRegionId(document: OverlayDocument, pageNumber: number): string {
  const page = document.pages.find((item) => item.pageNumber === pageNumber);
  if (!page) {
    return `page-${pageNumber}-region-1`;
  }
  const existingIds = new Set(page.regions.map((region) => region.id));
  let maxSequence = 0;
  const pattern = new RegExp(`^page-${pageNumber}-region-(\\d+)$`);
  for (const region of page.regions) {
    const match = pattern.exec(region.id);
    if (!match) {
      continue;
    }
    const sequence = Number(match[1]);
    if (Number.isInteger(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }
  let nextSequence = maxSequence + 1;
  let nextId = `page-${pageNumber}-region-${nextSequence}`;
  while (existingIds.has(nextId)) {
    nextSequence += 1;
    nextId = `page-${pageNumber}-region-${nextSequence}`;
  }
  return nextId;
}

function remapEntitySpansAfterTextChange(
  previousText: string,
  nextText: string,
  spans: OverlayEntitySpan[]
): { spans: OverlayEntitySpan[]; droppedCount: number } {
  if (previousText === nextText) {
    return { spans: normalizeEntitySpansForText(spans, nextText), droppedCount: 0 };
  }

  let start = 0;
  while (
    start < previousText.length &&
    start < nextText.length &&
    previousText.charCodeAt(start) === nextText.charCodeAt(start)
  ) {
    start += 1;
  }

  let previousSuffixIndex = previousText.length;
  let nextSuffixIndex = nextText.length;
  while (
    previousSuffixIndex > start &&
    nextSuffixIndex > start &&
    previousText.charCodeAt(previousSuffixIndex - 1) === nextText.charCodeAt(nextSuffixIndex - 1)
  ) {
    previousSuffixIndex -= 1;
    nextSuffixIndex -= 1;
  }

  const removedCount = previousSuffixIndex - start;
  const insertedCount = nextSuffixIndex - start;
  const delta = insertedCount - removedCount;
  const changedEnd = start + removedCount;

  const remapped: OverlayEntitySpan[] = [];
  let droppedCount = 0;

  for (const span of spans) {
    if (span.end <= start) {
      remapped.push(span);
      continue;
    }

    if (span.start >= changedEnd) {
      remapped.push({
        ...span,
        start: span.start + delta,
        end: span.end + delta
      });
      continue;
    }

    if (span.start < start && span.end > changedEnd) {
      const nextEnd = span.end + delta;
      if (nextEnd > span.start) {
        remapped.push({
          ...span,
          end: nextEnd
        });
      } else {
        droppedCount += 1;
      }
      continue;
    }

    if (span.start < start && span.end > start && span.end <= changedEnd) {
      const nextEnd = start;
      if (nextEnd > span.start) {
        remapped.push({
          ...span,
          end: nextEnd
        });
      } else {
        droppedCount += 1;
      }
      continue;
    }

    if (span.start >= start && span.start < changedEnd && span.end > changedEnd) {
      const nextStart = start + insertedCount;
      const nextEnd = span.end + delta;
      if (nextEnd > nextStart) {
        remapped.push({
          ...span,
          start: nextStart,
          end: nextEnd
        });
      } else {
        droppedCount += 1;
      }
      continue;
    }

    droppedCount += 1;
  }

  const normalized = normalizeEntitySpansForText(remapped, nextText);
  droppedCount += Math.max(0, remapped.length - normalized.length);
  return { spans: normalized, droppedCount };
}

function getTextareaSelectionOffsets(textarea: HTMLTextAreaElement, text: string): PendingSelectionRange | null {
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  if (
    typeof selectionStart !== "number" ||
    typeof selectionEnd !== "number" ||
    selectionStart === selectionEnd
  ) {
    return null;
  }

  const start = Math.max(0, Math.min(selectionStart, selectionEnd));
  const end = Math.max(start, Math.max(selectionStart, selectionEnd));
  if (end > text.length) {
    return null;
  }

  return {
    start,
    end,
    text: text.slice(start, end)
  };
}

function buildTextSegments(
  text: string,
  entities: OverlayEntitySpan[]
): Array<{ text: string; entityIndex: number | null; entity: string | null; start: number | null; end: number | null }> {
  const segments: Array<{
    text: string;
    entityIndex: number | null;
    entity: string | null;
    start: number | null;
    end: number | null;
  }> = [];
  const normalizedEntities = sortEntitySpans(entities);
  let cursor = 0;

  normalizedEntities.forEach((entity, index) => {
    if (entity.start > cursor) {
      segments.push({
        text: text.slice(cursor, entity.start),
        entityIndex: null,
        entity: null,
        start: null,
        end: null
      });
    }
    segments.push({
      text: text.slice(entity.start, entity.end),
      entityIndex: index,
      entity: entity.entity,
      start: entity.start,
      end: entity.end
    });
    cursor = entity.end;
  });

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      entityIndex: null,
      entity: null,
      start: null,
      end: null
    });
  }

  if (segments.length === 0) {
    segments.push({
      text: "",
      entityIndex: null,
      entity: null,
      start: null,
      end: null
    });
  }

  return segments;
}

function areEntitySpansEqual(left: OverlayEntitySpan[], right: OverlayEntitySpan[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (
      left[index].start !== right[index].start ||
      left[index].end !== right[index].end ||
      left[index].entity !== right[index].entity
    ) {
      return false;
    }
  }
  return true;
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
  const createDraftRef = useRef<CreateDraftState | null>(null);
  const dialogTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogPreviewRef = useRef<HTMLDivElement | null>(null);

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
  const [dialogDraftEntities, setDialogDraftEntities] = useState<OverlayEntitySpan[]>([]);
  const [dialogTextDirection, setDialogTextDirection] = useState<TextDirection>("rtl");
  const [pendingSelection, setPendingSelection] = useState<PendingSelectionRange | null>(null);
  const [pendingEntity, setPendingEntity] = useState<string>(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
  const [pickerSelection, setPickerSelection] = useState<PendingSelectionRange | null>(null);
  const [spanEditor, setSpanEditor] = useState<SpanEditorDraft | null>(null);
  const [entityWarning, setEntityWarning] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<OverlayInteractionState | null>(null);
  const [draft, setDraft] = useState<OverlayDraftState | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createInteraction, setCreateInteraction] = useState<CreateInteractionState | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraftState | null>(null);

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
    setDialogDraftEntities([]);
    setDialogTextDirection("rtl");
    setPendingSelection(null);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
    setInteraction(null);
    setDraft(null);
    draftRef.current = null;
    setIsCreateMode(false);
    setCreateInteraction(null);
    setCreateDraft(null);
    createDraftRef.current = null;
  }, [overlayDocument, currentPage]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    createDraftRef.current = createDraft;
  }, [createDraft]);

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
    if (isCreateMode || !overlayDocument || pageWidth <= 0 || pageHeight <= 0) {
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

  const beginCreateBBox = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isCreateMode || !overlayDocument || pageWidth <= 0 || pageHeight <= 0 || !pdfDoc) {
      return;
    }

    const startPointer = getNormalizedPointer(event.clientX, event.clientY);
    if (!startPointer) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const minimumSize = computeNormalizedMinimumSize(pageWidth, pageHeight, 10);
    const nextBbox = resolveCreateBbox(startPointer, startPointer);
    setCreateInteraction({
      pointerId: event.pointerId,
      pageNumber: currentPage,
      startPointer,
      minimumSize
    });
    setCreateDraft({
      pageNumber: currentPage,
      bbox: nextBbox
    });
  }, [currentPage, isCreateMode, overlayDocument, pageHeight, pageWidth, pdfDoc]);

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

  useEffect(() => {
    if (!createInteraction) {
      return;
    }

    const handleCreatePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== createInteraction.pointerId) {
        return;
      }

      const pointer = getNormalizedPointer(event.clientX, event.clientY);
      if (!pointer) {
        return;
      }

      const nextBbox = resolveCreateBbox(createInteraction.startPointer, pointer);
      setCreateDraft({
        pageNumber: createInteraction.pageNumber,
        bbox: nextBbox
      });
    };

    const handleCreatePointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== createInteraction.pointerId) {
        return;
      }

      const draftBbox =
        createDraftRef.current?.pageNumber === createInteraction.pageNumber
          ? createDraftRef.current.bbox
          : resolveCreateBbox(createInteraction.startPointer, createInteraction.startPointer);

      const isValidBbox =
        draftBbox.x2 > draftBbox.x1 &&
        draftBbox.y2 > draftBbox.y1 &&
        isBboxLargeEnough(draftBbox, createInteraction.minimumSize);

      if (isValidBbox && overlayDocument && onOverlayDocumentSaved) {
        const nextRegion: OverlayRegion = {
          id: buildNextRegionId(overlayDocument, createInteraction.pageNumber),
          pageNumber: createInteraction.pageNumber,
          label: "Text",
          bbox: draftBbox,
          matchedContent: false,
          text: "",
          entities: [],
          metadata: {
            pageNumber: Math.max(0, createInteraction.pageNumber - 1),
            regionId: null
          },
          layoutSource: null,
          contentSource: null
        };

        onOverlayEditStarted?.();
        onOverlayDocumentSaved(addRegionToDocument(overlayDocument, createInteraction.pageNumber, nextRegion));
        setIsCreateMode(false);
      }

      setCreateInteraction(null);
      setCreateDraft(null);
      createDraftRef.current = null;
    };

    window.addEventListener("pointermove", handleCreatePointerMove);
    window.addEventListener("pointerup", handleCreatePointerEnd);
    window.addEventListener("pointercancel", handleCreatePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handleCreatePointerMove);
      window.removeEventListener("pointerup", handleCreatePointerEnd);
      window.removeEventListener("pointercancel", handleCreatePointerEnd);
    };
  }, [createInteraction, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument]);

  const statusText = buildStatusText(loadStatus, errorMessage);
  const hasPdf = Boolean(pdfDoc);
  const currentPageOverlays = useMemo(
    () => overlayDocument?.pages.find((page) => page.pageNumber === currentPage)?.regions ?? [],
    [currentPage, overlayDocument]
  );
  const visiblePageOverlays = useMemo(() => {
    let overlays = currentPageOverlays;
    if (draft && draft.pageNumber === currentPage) {
      overlays = currentPageOverlays.map((region) =>
        region.id === draft.regionId
          ? {
              ...region,
              bbox: draft.bbox
            }
          : region
      );
    }

    if (createDraft && createDraft.pageNumber === currentPage) {
      overlays = [
        ...overlays,
        {
          id: "__create-draft__",
          pageNumber: currentPage,
          label: "Text",
          bbox: createDraft.bbox,
          matchedContent: false,
          text: "",
          entities: [],
          metadata: {
            pageNumber: Math.max(0, currentPage - 1),
            regionId: null
          },
          layoutSource: null,
          contentSource: null
        }
      ];
    }

    return overlays;
  }, [createDraft, currentPage, currentPageOverlays, draft]);
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
      dialogDraftText !== (activeRegion.text || "") ||
      !areEntitySpansEqual(
        normalizeEntitySpansForText(dialogDraftEntities, dialogDraftText),
        normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || "")
      )
    );
  }, [activeRegion, dialogDraftEntities, dialogDraftLabel, dialogDraftText]);
  const normalizedDraftEntities = useMemo(
    () => normalizeEntitySpansForText(dialogDraftEntities, dialogDraftText),
    [dialogDraftEntities, dialogDraftText]
  );
  const textSegments = useMemo(
    () => buildTextSegments(dialogDraftText, normalizedDraftEntities),
    [dialogDraftText, normalizedDraftEntities]
  );
  const canAnonymizeSelection = useMemo(() => {
    if (!pendingSelection) {
      return false;
    }
    return !hasEntityOverlap(normalizedDraftEntities, pendingSelection.start, pendingSelection.end);
  }, [normalizedDraftEntities, pendingSelection]);
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
    setDialogDraftEntities(normalizeEntitySpansForText(region.entities || [], region.text || ""));
    setDialogTextDirection("rtl");
    setPendingSelection(null);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
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
    setDialogDraftEntities([]);
    setDialogTextDirection("rtl");
    setPendingSelection(null);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [hasDialogChanges]);
  const handleResetRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }
    setDialogDraftLabel(activeRegion.label);
    setDialogDraftText(activeRegion.text || "");
    setDialogDraftEntities(normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || ""));
    setPendingSelection(null);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [activeRegion]);
  const handleSaveRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }

    const nextLabel = dialogDraftLabel.trim() || activeRegion.label;
    const nextText = dialogDraftText;
    const nextEntities = normalizeEntitySpansForText(dialogDraftEntities, nextText);

    if (overlayDocument && onOverlayDocumentSaved) {
      onOverlayEditStarted?.();
      const nextDocument = applyRegionEdits(overlayDocument, activeRegion.pageNumber, activeRegion.id, {
        label: nextLabel,
        text: nextText,
        entities: nextEntities
      });
      onOverlayDocumentSaved(nextDocument);
    }

    setActiveRegionId(null);
    setDialogDraftLabel("");
    setDialogDraftText("");
    setDialogDraftEntities([]);
    setDialogTextDirection("rtl");
    setPendingSelection(null);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [
    activeRegion,
    dialogDraftEntities,
    dialogDraftLabel,
    dialogDraftText,
    onOverlayDocumentSaved,
    onOverlayEditStarted,
    overlayDocument
  ]);
  const handleDeleteRegionEditor = useCallback(() => {
    if (!activeRegion || !overlayDocument || !onOverlayDocumentSaved) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this bbox region? This will remove it from generated JSON output."
    );
    if (!shouldDelete) {
      return;
    }

    onOverlayEditStarted?.();
    const nextDocument = removeRegionFromDocument(
      overlayDocument,
      activeRegion.pageNumber,
      activeRegion.id
    );
    onOverlayDocumentSaved(nextDocument);

    setActiveRegionId(null);
    setDialogDraftLabel("");
    setDialogDraftText("");
    setDialogDraftEntities([]);
    setDialogTextDirection("rtl");
    setPendingSelection(null);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [activeRegion, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument]);
  const refreshPendingSelection = useCallback(() => {
    const textarea = dialogTextareaRef.current;
    if (!textarea) {
      setPendingSelection(null);
      return;
    }
    const offsets = getTextareaSelectionOffsets(textarea, dialogDraftText);
    setPendingSelection(offsets);
  }, [dialogDraftText]);
  const handleEditorInput: ChangeEventHandler<HTMLTextAreaElement> = useCallback((event) => {
    const nextText = event.currentTarget.value.replace(/\r/g, "");
    const remapResult = remapEntitySpansAfterTextChange(
      dialogDraftText,
      nextText,
      dialogDraftEntities
    );
    setDialogDraftText(nextText);
    setDialogDraftEntities(remapResult.spans);
    setPendingSelection(null);
    setPickerSelection(null);
    setSpanEditor(null);
    if (remapResult.droppedCount > 0) {
      setEntityWarning(
        `${remapResult.droppedCount} anonymized span(s) were removed because they could not be remapped after text edits.`
      );
    } else {
      setEntityWarning(null);
    }
  }, [dialogDraftEntities, dialogDraftText]);
  const handleEditorKeyUp = useCallback((_event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    refreshPendingSelection();
  }, [refreshPendingSelection]);
  const handleAnonymizeSelection = useCallback(() => {
    const textarea = dialogTextareaRef.current;
    const selectionToUse = pendingSelection ?? (textarea ? getTextareaSelectionOffsets(textarea, dialogDraftText) : null);
    if (!selectionToUse) {
      setEntityWarning("Select a continuous text range before anonymizing.");
      return;
    }

    if (hasEntityOverlap(normalizedDraftEntities, selectionToUse.start, selectionToUse.end)) {
      setEntityWarning("Overlapping anonymized spans are not allowed.");
      return;
    }

    setPendingSelection(selectionToUse);
    setPickerSelection(selectionToUse);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setEntityWarning(null);
  }, [dialogDraftText, normalizedDraftEntities, pendingSelection]);
  const handleApplyPickerEntity = useCallback(() => {
    if (!pickerSelection) {
      setEntityWarning("Select a continuous text range before anonymizing.");
      return;
    }
    const nextEntity = coerceEntityLabel(pendingEntity);
    if (!nextEntity) {
      setEntityWarning("Choose an entity label.");
      return;
    }
    if (hasEntityOverlap(normalizedDraftEntities, pickerSelection.start, pickerSelection.end)) {
      setEntityWarning("Overlapping anonymized spans are not allowed.");
      return;
    }

    const nextSpans = sortEntitySpans([
      ...normalizedDraftEntities,
      {
        start: pickerSelection.start,
        end: pickerSelection.end,
        entity: nextEntity
      }
    ]);
    setDialogDraftEntities(nextSpans);
    setPendingSelection(null);
    setPickerSelection(null);
    setEntityWarning(null);
  }, [normalizedDraftEntities, pendingEntity, pickerSelection]);
  const handleOpenSpanEditor = useCallback((index: number, anchorX: number, anchorY: number) => {
    const span = normalizedDraftEntities[index];
    if (!span) {
      return;
    }
    setSpanEditor({
      index,
      entity: coerceEntityLabel(span.entity),
      anchorX,
      anchorY
    });
    setPendingSelection(null);
    setPickerSelection(null);
  }, [normalizedDraftEntities]);
  const handleApplySpanEditor = useCallback(() => {
    if (!spanEditor) {
      return;
    }
    if (!normalizedDraftEntities[spanEditor.index]) {
      setEntityWarning("This span no longer exists.");
      setSpanEditor(null);
      return;
    }

    const nextEntity = coerceEntityLabel(spanEditor.entity);
    if (!nextEntity) {
      setEntityWarning("Choose an entity for the highlighted range.");
      return;
    }

    const nextSpans = normalizedDraftEntities.map((span, index) =>
      index === spanEditor.index
        ? {
            start: span.start,
            end: span.end,
            entity: nextEntity
          }
        : span
    );
    setDialogDraftEntities(sortEntitySpans(nextSpans));
    setSpanEditor(null);
    setEntityWarning(null);
  }, [normalizedDraftEntities, spanEditor]);
  const handleRemoveSpan = useCallback(() => {
    if (!spanEditor) {
      return;
    }
    if (!normalizedDraftEntities[spanEditor.index]) {
      setEntityWarning("This span no longer exists.");
      setSpanEditor(null);
      return;
    }
    setDialogDraftEntities(normalizedDraftEntities.filter((_span, index) => index !== spanEditor.index));
    setSpanEditor(null);
    setEntityWarning(null);
  }, [normalizedDraftEntities, spanEditor]);
  useEffect(() => {
    if (!spanEditor) {
      return;
    }
    if (!normalizedDraftEntities[spanEditor.index]) {
      setSpanEditor(null);
    }
  }, [normalizedDraftEntities, spanEditor]);
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
              className={`icon-button ${isCreateMode ? "active" : ""}`}
              onClick={() => {
                setIsCreateMode((previous) => {
                  const next = !previous;
                  if (!next) {
                    setCreateInteraction(null);
                    setCreateDraft(null);
                    createDraftRef.current = null;
                  }
                  return next;
                });
              }}
              disabled={!hasPdf || !overlayDocument}
              aria-pressed={isCreateMode}
            >
              {isCreateMode ? "Cancel Add BBox" : "Add BBox"}
            </button>
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
          {hasPdf && (visiblePageOverlays.length > 0 || isCreateMode) && (
            <div className="overlay-layer" aria-label="Page overlays">
              {isCreateMode && (
                <div
                  className="overlay-create-surface"
                  onPointerDown={beginCreateBBox}
                  aria-label="Create bbox surface"
                  role="button"
                />
              )}
              {visiblePageOverlays.map((region) => {
                const isCreateDraftRegion = region.id === "__create-draft__";
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
                      onDoubleClick={() => {
                        if (isCreateMode || isCreateDraftRegion) {
                          return;
                        }
                        openRegionEditor(region);
                      }}
                      aria-hidden="true"
                    />
                    {!isCreateDraftRegion && (
                      <>
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
                          onClick={() => {
                            if (isCreateMode) {
                              return;
                            }
                            openRegionEditor(region);
                          }}
                          aria-label={`Edit ${region.label} region`}
                        >
                          Edit
                        </button>
                      </>
                    )}
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
                <div className="overlay-dialog-text-controls">
                  <button
                    type="button"
                    className="ghost-button overlay-dialog-direction-toggle"
                    onClick={() =>
                      setDialogTextDirection((prev) => (prev === "rtl" ? "ltr" : "rtl"))
                    }
                  >
                    {dialogTextDirection === "rtl" ? "Switch to LTR" : "Switch to RTL"}
                  </button>
                  <button
                    type="button"
                    className="action-button secondary anonymize-button"
                    onClick={handleAnonymizeSelection}
                    disabled={!pendingSelection || !canAnonymizeSelection}
                  >
                    Anonymize
                  </button>

                  {pickerSelection && (
                    <div className="overlay-entity-picker controls-picker">
                      <span className="overlay-dialog-text-label">
                        Selected [{pickerSelection.start}, {pickerSelection.end}): "{pickerSelection.text}"
                      </span>
                      <label className="overlay-dialog-text-label" htmlFor="overlay-entity-select">
                        Entity
                      </label>
                  <select
                    id="overlay-entity-select"
                    className="overlay-dialog-select"
                    value={coerceEntityLabel(pendingEntity)}
                    onChange={(event) => setPendingEntity(coerceEntityLabel(event.currentTarget.value))}
                  >
                        {ANONYMIZATION_ENTITY_LABELS.map((entity) => (
                          <option key={entity} value={entity}>
                            {entity}
                          </option>
                        ))}
                      </select>
                      <div className="overlay-span-editor-actions">
                        <button type="button" className="action-button secondary" onClick={handleApplyPickerEntity}>
                          Apply Entity
                        </button>
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => {
                            setPickerSelection(null);
                            setEntityWarning(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="overlay-dialog-editor-grid">
                <div className="overlay-dialog-editor-column">
                  <div className="overlay-dialog-preview-label">Text Input</div>
                  <textarea
                    id="overlay-text-content"
                    className="overlay-dialog-text-input"
                    dir={dialogTextDirection}
                    ref={dialogTextareaRef}
                    value={dialogDraftText}
                    role="textbox"
                    aria-label="Text"
                    onChange={handleEditorInput}
                    onSelect={refreshPendingSelection}
                    onMouseUp={refreshPendingSelection}
                    onKeyUp={handleEditorKeyUp}
                  />
                </div>
                <div className="overlay-dialog-editor-column">
                  <div className="overlay-dialog-preview-label">Anonymization Preview</div>
                  <div
                    ref={dialogPreviewRef}
                    className="overlay-dialog-text-preview"
                    dir={dialogTextDirection}
                  >
                    {textSegments.map((segment, index) => {
                      if (segment.entityIndex === null || !segment.entity) {
                        return (
                          <span key={`plain-${index}`} className="overlay-dialog-segment">
                            {segment.text}
                          </span>
                        );
                      }
                      const palette = buildEntityPalette(segment.entity);
                      return (
                        <span
                          key={`entity-${segment.entityIndex}-${index}`}
                          className="overlay-dialog-entity-span"
                          style={{
                            background: palette.background,
                            color: palette.text,
                            borderColor: palette.border
                          }}
                          title={`${segment.entity} [${segment.start ?? "?"}-${segment.end ?? "?"}]`}
                          onDoubleClick={(event) => {
                            if (segment.entityIndex === null) {
                              return;
                            }
                            event.preventDefault();
                            event.stopPropagation();
                            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                            const previewRect = dialogPreviewRef.current?.getBoundingClientRect();
                            handleOpenSpanEditor(
                              segment.entityIndex,
                              previewRect ? rect.left - previewRect.left : rect.left,
                              previewRect ? rect.bottom - previewRect.top + 6 : rect.bottom + 6
                            );
                          }}
                        >
                          {segment.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {spanEditor && (
                <div
                  className="overlay-span-editor floating"
                  style={{
                    left: `${Math.max(8, spanEditor.anchorX)}px`,
                    top: `${Math.max(8, spanEditor.anchorY)}px`
                  }}
                >
                  <h3>Edit Anonymized Span</h3>
                  <label className="overlay-dialog-text-label" htmlFor="overlay-span-entity">
                    Entity
                  </label>
                  <select
                    id="overlay-span-entity"
                    className="overlay-dialog-select"
                    value={coerceEntityLabel(spanEditor.entity)}
                    onChange={(event) => {
                      const nextEntity = coerceEntityLabel(event.currentTarget.value);
                      setSpanEditor((previous) =>
                        previous
                          ? {
                              ...previous,
                              entity: nextEntity
                            }
                          : previous
                      );
                    }}
                  >
                    {ANONYMIZATION_ENTITY_LABELS.map((entity) => (
                      <option key={entity} value={entity}>
                        {entity}
                      </option>
                    ))}
                  </select>

                  <div className="overlay-span-editor-actions">
                    <button type="button" className="action-button secondary" onClick={handleApplySpanEditor}>
                      Save Span
                    </button>
                    <button type="button" className="action-button secondary danger" onClick={handleRemoveSpan}>
                      Remove Span
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() => setSpanEditor(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {entityWarning && <p className="status-line error">{entityWarning}</p>}

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
                  <div>
                    <dt>Entities</dt>
                    <dd>{normalizedDraftEntities.length}</dd>
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
              <button type="button" className="action-button secondary danger" onClick={handleDeleteRegionEditor}>
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

