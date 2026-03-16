import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OverlayDocument, OverlaySaveState } from "../../types/overlay";
import type { StoredPdfRecord } from "../../types/pdf";
import type { StorageService } from "../../types/services";
import { PdfViewerTab } from "./PdfViewerTab";

const mockGetDocument = vi.fn();

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: (...args: unknown[]) => mockGetDocument(...args)
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "mock-worker.js"
}));

beforeAll(() => {
  if (typeof window.PointerEvent === "undefined") {
    class MockPointerEvent extends MouseEvent {
      pointerId: number;

      constructor(type: string, params: MouseEventInit & { pointerId?: number } = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 1;
      }
    }

    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      writable: true,
      value: MockPointerEvent
    });
  }

  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    value: vi.fn(() => ({} as CanvasRenderingContext2D))
  });
});

beforeEach(() => {
  mockGetDocument.mockReset();
});

function createStorageMock(overrides?: Partial<StorageService>): StorageService {
  return {
    loadPdfRecord: vi.fn().mockResolvedValue(null),
    savePdfRecord: vi.fn().mockResolvedValue(undefined),
    replacePdf: vi.fn(),
    loadViewerState: vi.fn().mockResolvedValue(null),
    saveViewerState: vi.fn().mockResolvedValue(undefined),
    clearPdfRecord: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function createMockPdfDocument() {
  return {
    numPages: 1,
    getPage: vi.fn().mockResolvedValue({
      getViewport: vi.fn().mockReturnValue({ width: 500, height: 700 }),
      render: vi.fn().mockReturnValue({
        promise: Promise.resolve(),
        cancel: vi.fn()
      })
    }),
    destroy: vi.fn().mockResolvedValue(undefined)
  };
}

function createPdfBlob(): Blob {
  const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]);
  return {
    arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer)
  } as unknown as Blob;
}

function createOverlayDocument(): OverlayDocument {
  return {
    pages: [
      {
        pageNumber: 1,
        regions: [
          {
            id: "page-1-region-1",
            pageNumber: 1,
            label: "Text",
            bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
            matchedContent: true,
            text: "Region body text",
            metadata: { pageNumber: 1, regionId: 9 },
            layoutSource: { pageIndex: 0, regionIndex: 0 },
            contentSource: { pageIndex: 0, regionIndex: 0 }
          }
        ]
      }
    ]
  };
}

function createStoredRecord(file: File): StoredPdfRecord {
  return {
    id: "last-uploaded-pdf",
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    updatedAt: new Date().toISOString(),
    pdfBlob: createPdfBlob(),
    viewerState: { currentPage: 1, zoom: 1 }
  };
}

function setStageRect() {
  const stage = document.querySelector(".page-stage") as HTMLDivElement;
  expect(stage).toBeTruthy();
  vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    width: 500,
    height: 700,
    top: 0,
    left: 0,
    right: 500,
    bottom: 700,
    toJSON: () => ({})
  } as DOMRect);
}

async function uploadPdf(container: HTMLElement, file: File) {
  const user = userEvent.setup();
  const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, file);
}

async function waitForPageRender() {
  await waitFor(() => {
    const stage = document.querySelector(".page-stage") as HTMLDivElement | null;
    expect(stage).not.toBeNull();
    expect(stage?.style.width).toBe("500px");
    expect(stage?.style.height).toBe("700px");
  });
}

describe("PdfViewerTab", () => {
  it("shows upload empty state when no stored PDF exists", async () => {
    const storage = createStorageMock();
    render(<PdfViewerTab storageService={storage} />);

    expect(await screen.findByText("No PDF uploaded yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Upload PDF" }).length).toBeGreaterThanOrEqual(1);
  });

  it("replaces PDF when user uploads a file", async () => {
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });

    const { container } = render(<PdfViewerTab storageService={storage} />);
    await uploadPdf(container, file);

    await waitFor(() => {
      expect(replacePdf).toHaveBeenCalled();
      expect(screen.getByText(/uploaded\.pdf/i)).toBeInTheDocument();
    });
  });

  it("renders overlays and opens the edit dialog", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });

    const { container } = render(<PdfViewerTab storageService={storage} overlayDocument={overlays} />);
    await uploadPdf(container, file);

    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit Text region" }));

    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();
    expect(screen.getByText("Label:")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Region body text")).toBeInTheDocument();

    await user.click(screen.getByText("Metadata"));
    expect(screen.getByText("Region ID")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();

    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    await user.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.queryByRole("heading", { name: "Edit Region" })).not.toBeInTheDocument();
  });

  it("drags bbox and commits bounded geometry", async () => {
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });

    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const overlayDocument = createOverlayDocument();
    const onOverlayEditStarted = vi.fn();
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlayDocument}
        overlaySaveState={{ isSaving: false, isSaved: true, lastSavedAt: null }}
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);

    await screen.findByText(/overlays/i);
    await waitForPageRender();
    setStageRect();

    const dragSurface = container.querySelector(".overlay-drag-surface") as HTMLElement;
    fireEvent.pointerDown(dragSurface, { pointerId: 1, clientX: 50, clientY: 70 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 200, clientY: 220 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 200, clientY: 220 });

    expect(onOverlayEditStarted).toHaveBeenCalledTimes(1);
    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);

    const savedDocument = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    const savedBbox = savedDocument.pages[0].regions[0].bbox;

    expect(savedBbox.x1).toBeGreaterThanOrEqual(0);
    expect(savedBbox.y1).toBeGreaterThanOrEqual(0);
    expect(savedBbox.x2).toBeLessThanOrEqual(1);
    expect(savedBbox.y2).toBeLessThanOrEqual(1);
    expect(savedBbox.x1).toBeLessThan(savedBbox.x2);
    expect(savedBbox.y1).toBeLessThan(savedBbox.y2);
  });

  it("resizes bbox from corner without flipping and within page bounds", async () => {
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });

    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const overlayDocument = createOverlayDocument();
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlayDocument}
        onOverlayEditStarted={vi.fn()}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);

    await screen.findByText(/overlays/i);
    await waitForPageRender();
    setStageRect();

    const resizeHandle = screen.getByRole("button", { name: "Resize Text region (NW)" });
    fireEvent.pointerDown(resizeHandle, { pointerId: 2, clientX: 50, clientY: 70 });
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 700, clientY: 900 });
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 700, clientY: 900 });

    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);

    const savedDocument = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    const savedBbox = savedDocument.pages[0].regions[0].bbox;

    expect(savedBbox.x1).toBeGreaterThanOrEqual(0);
    expect(savedBbox.y1).toBeGreaterThanOrEqual(0);
    expect(savedBbox.x2).toBeLessThanOrEqual(1);
    expect(savedBbox.y2).toBeLessThanOrEqual(1);
    expect(savedBbox.x1).toBeLessThan(savedBbox.x2);
    expect(savedBbox.y1).toBeLessThan(savedBbox.y2);
  });

  it("shows save indicator from overlay save-state", async () => {
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });

    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const overlays = createOverlayDocument();

    const { container, rerender } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        overlaySaveState={{ isSaving: true, isSaved: false, lastSavedAt: null }}
      />
    );

    await uploadPdf(container, file);
    expect(await screen.findByText("Saving...")).toBeInTheDocument();

    const savedState: OverlaySaveState = {
      isSaving: false,
      isSaved: true,
      lastSavedAt: "2026-03-16T12:00:00.000Z"
    };

    rerender(
      <PdfViewerTab storageService={storage} overlayDocument={overlays} overlaySaveState={savedState} />
    );

    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
  });
});
