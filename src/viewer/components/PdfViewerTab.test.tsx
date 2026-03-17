import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMIZATION_ENTITY_LABELS,
  FALLBACK_ANONYMIZATION_ENTITY_LABEL
} from "../../shared/anonymizationEntities";
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
            entities: [],
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

function setEditorSelection(editor: HTMLElement, start: number, end: number) {
  const textarea = editor as HTMLTextAreaElement;
  const safeStart = Math.max(0, Math.min(start, textarea.value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, textarea.value.length));
  textarea.focus();
  textarea.setSelectionRange(safeStart, safeEnd);
  fireEvent.select(textarea);
}

function setEditorText(editor: HTMLElement, value: string) {
  fireEvent.change(editor, { target: { value } });
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

  it("disables Add BBox when no overlay document is loaded", async () => {
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const { container } = render(<PdfViewerTab storageService={storage} />);
    await uploadPdf(container, file);

    expect(await screen.findByText(/uploaded\.pdf/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add BBox" })).toBeDisabled();
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

  it("renders overlays and opens the edit dialog from button and double click", async () => {
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
    expect(screen.getByLabelText("Label")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Text" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Text" })).toHaveValue("Region body text");
    expect(screen.getByRole("textbox", { name: "Text" })).toHaveAttribute("dir", "rtl");
    await user.click(screen.getByRole("button", { name: "Switch to LTR" }));
    expect(screen.getByRole("textbox", { name: "Text" })).toHaveAttribute("dir", "ltr");

    await user.click(screen.getByRole("button", { name: "Close region editor" }));
    expect(screen.queryByRole("heading", { name: "Edit Region" })).not.toBeInTheDocument();

    const dragSurface = container.querySelector(".overlay-drag-surface") as HTMLElement;
    fireEvent.doubleClick(dragSurface);
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Text" })).toHaveAttribute("dir", "rtl");
  });

  it("saves label/text dialog edits, triggers autosave callbacks, and closes", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const onOverlayEditStarted = vi.fn();
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));
    await user.selectOptions(screen.getByLabelText("Label"), "Table");
    setEditorText(screen.getByRole("textbox", { name: "Text" }), "Edited body text");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onOverlayEditStarted).toHaveBeenCalledTimes(1);
    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const savedDocument = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(savedDocument.pages[0].regions[0].label).toBe("Table");
    expect(savedDocument.pages[0].regions[0].text).toBe("Edited body text");
    expect(screen.queryByRole("heading", { name: "Edit Region" })).not.toBeInTheDocument();
  });

  it("resets in-dialog draft changes without closing", async () => {
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
    await user.selectOptions(screen.getByLabelText("Label"), "Picture");
    setEditorText(screen.getByRole("textbox", { name: "Text" }), "dirty text");

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Label")).toHaveValue("Text");
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Text" })).toHaveValue("Region body text");
    });
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();
  });

  it("prompts on Esc/X/Cancel when dialog has pending changes", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const confirmSpy = vi.spyOn(window, "confirm");

    const { container } = render(<PdfViewerTab storageService={storage} overlayDocument={overlays} />);
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));
    setEditorText(screen.getByRole("textbox", { name: "Text" }), "dirty");

    confirmSpy.mockReturnValueOnce(false);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();

    confirmSpy.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Close region editor" }));
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();

    confirmSpy.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirmSpy).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("heading", { name: "Edit Region" })).not.toBeInTheDocument();
  });

  it("prompts on dialog Delete and removes region only on confirm", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const onOverlayEditStarted = vi.fn();
    const onOverlayDocumentSaved = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm");

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));

    confirmSpy.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onOverlayEditStarted).not.toHaveBeenCalled();
    expect(onOverlayDocumentSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();

    confirmSpy.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(onOverlayEditStarted).toHaveBeenCalledTimes(1);
    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const savedDocument = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(savedDocument.pages[0].regions).toHaveLength(0);
    expect(screen.queryByRole("heading", { name: "Edit Region" })).not.toBeInTheDocument();
  });

  it("creates anonymized span from selected text and saves entities", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        onOverlayEditStarted={vi.fn()}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));
    const editor = screen.getByRole("textbox", { name: "Text" });
    editor.focus();
    setEditorSelection(editor, 0, 6);
    fireEvent.mouseUp(editor);
    fireEvent.keyUp(editor, { key: "Shift" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anonymize" })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "Anonymize" }));
    const entitySelect = screen.getByLabelText("Entity") as HTMLSelectElement;
    const firstEntity = entitySelect.options[0].value;
    await user.selectOptions(entitySelect, firstEntity);
    await user.click(screen.getByRole("button", { name: "Apply Entity" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const saved = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(saved.pages[0].regions[0].entities).toEqual([
      {
        start: 0,
        end: 6,
        entity: firstEntity
      }
    ]);
  });

  it("keeps normal typing behavior and opens entity picker only after anonymize click", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        onOverlayEditStarted={vi.fn()}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));
    const editor = screen.getByRole("textbox", { name: "Text" }) as HTMLTextAreaElement;
    expect(editor).toHaveValue("Region body text");

    await user.type(editor, "!");
    expect(editor.value).toBe("Region body text!");
    expect(editor.value.split("!").length - 1).toBe(1);

    setEditorSelection(editor, 0, 6);
    fireEvent.mouseUp(editor);
    expect(screen.queryByRole("button", { name: "Apply Entity" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Anonymize" }));
    expect(screen.getByRole("button", { name: "Apply Entity" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const saved = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(saved.pages[0].regions[0].text).toBe("Region body text!");
    expect(saved.pages[0].regions[0].entities).toEqual([]);
  });

  it("adds another anonymized span after a new selection", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        onOverlayEditStarted={vi.fn()}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));
    const editor = screen.getByRole("textbox", { name: "Text" });
    editor.focus();

    setEditorSelection(editor, 0, 4);
    fireEvent.mouseUp(editor);
    fireEvent.keyUp(editor, { key: "Shift" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anonymize" })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "Anonymize" }));
    await user.click(screen.getByRole("button", { name: "Apply Entity" }));

    setEditorSelection(editor, 5, 9);
    fireEvent.mouseUp(editor);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anonymize" })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "Anonymize" }));
    await user.click(screen.getByRole("button", { name: "Apply Entity" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const saved = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(saved.pages[0].regions[0].entities).toHaveLength(2);
  });

  it("allows editing/removing anonymized spans on highlighted text double-click", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        onOverlayEditStarted={vi.fn()}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));
    const editor = screen.getByRole("textbox", { name: "Text" });
    editor.focus();

    setEditorSelection(editor, 0, 6);
    fireEvent.mouseUp(editor);
    fireEvent.keyUp(editor, { key: "Shift" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anonymize" })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "Anonymize" }));
    await user.click(screen.getByRole("button", { name: "Apply Entity" }));

    const highlighted = screen.getByText("Region");
    fireEvent.doubleClick(highlighted);
    expect(screen.getByRole("heading", { name: "Edit Anonymized Span" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Span" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const saved = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(saved.pages[0].regions[0].entities).toEqual([]);
  });

  it("updates span entity when editor changes it to a different value", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        onOverlayEditStarted={vi.fn()}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));
    const editor = screen.getByRole("textbox", { name: "Text" });
    editor.focus();

    setEditorSelection(editor, 0, 6);
    fireEvent.mouseUp(editor);
    fireEvent.keyUp(editor, { key: "Shift" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anonymize" })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: "Anonymize" }));
    await user.click(screen.getByRole("button", { name: "Apply Entity" }));

    fireEvent.doubleClick(screen.getByText("Region"));
    expect(screen.getByRole("heading", { name: "Edit Anonymized Span" })).toBeInTheDocument();

    const spanEntitySelect = screen.getByLabelText("Entity") as HTMLSelectElement;
    const updatedEntity = ANONYMIZATION_ENTITY_LABELS[1];
    await user.selectOptions(spanEntitySelect, updatedEntity);
    await user.click(screen.getByRole("button", { name: "Save Span" }));
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const saved = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(saved.pages[0].regions[0].entities).toEqual([
      {
        start: 0,
        end: 6,
        entity: updatedEntity
      }
    ]);
  });

  it("opens editor safely and coerces malformed/non-canonical entities to fallback", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(doc)
    });

    const overlays = createOverlayDocument();
    overlays.pages[0].regions[0].entities = [
      { start: 0, end: 6, entity: "invalid-entity" },
      { start: 2, end: 8, entity: "overlap-drop" },
      { start: -1, end: 3, entity: "bad-range" }
    ];

    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const onOverlayDocumentSaved = vi.fn();

    const { container } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlays}
        onOverlayEditStarted={vi.fn()}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);
    expect(await screen.findByText(/overlays/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit Text region" }));
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByText("Region"));
    const spanEntitySelect = screen.getByLabelText("Entity") as HTMLSelectElement;
    expect(spanEntitySelect.value).toBe(FALLBACK_ANONYMIZATION_ENTITY_LABEL);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const saved = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(saved.pages[0].regions[0].entities).toEqual([
      {
        start: 0,
        end: 6,
        entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL
      }
    ]);
  });

  it("does not auto-save when a bbox is only clicked without movement", async () => {
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
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);

    await screen.findByText(/overlays/i);
    await waitForPageRender();
    setStageRect();

    const dragSurface = container.querySelector(".overlay-drag-surface") as HTMLElement;
    fireEvent.pointerDown(dragSurface, { pointerId: 9, clientX: 120, clientY: 140 });
    fireEvent.pointerUp(window, { pointerId: 9, clientX: 120, clientY: 140 });

    expect(onOverlayEditStarted).not.toHaveBeenCalled();
    expect(onOverlayDocumentSaved).not.toHaveBeenCalled();
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

  it("creates a new bbox via Add BBox drag, then allows editing it like existing regions", async () => {
    const user = userEvent.setup();
    const file = new File(["%PDF-test"], "uploaded.pdf", { type: "application/pdf" });
    const doc = createMockPdfDocument();

    mockGetDocument.mockReturnValue({ promise: Promise.resolve(doc) });

    const replacePdf = vi.fn().mockResolvedValue(createStoredRecord(file));
    const storage = createStorageMock({ replacePdf });
    const overlayDocument = createOverlayDocument();
    const onOverlayEditStarted = vi.fn();
    const onOverlayDocumentSaved = vi.fn();

    const { container, rerender } = render(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={overlayDocument}
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);

    await screen.findByText(/overlays/i);
    await waitForPageRender();
    setStageRect();

    await user.click(screen.getByRole("button", { name: "Add BBox" }));
    expect(screen.getByRole("button", { name: "Cancel Add BBox" })).toBeInTheDocument();

    const createSurface = screen.getByLabelText("Create bbox surface");
    fireEvent.pointerDown(createSurface, { pointerId: 11, clientX: 120, clientY: 130 });
    fireEvent.pointerMove(window, { pointerId: 11, clientX: 250, clientY: 320 });
    fireEvent.pointerUp(window, { pointerId: 11, clientX: 250, clientY: 320 });

    expect(onOverlayEditStarted).toHaveBeenCalledTimes(1);
    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);

    const createdDocument = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(createdDocument.pages[0].regions).toHaveLength(2);
    const createdRegion = createdDocument.pages[0].regions[1];
    expect(createdRegion).toMatchObject({
      pageNumber: 1,
      label: "Text",
      matchedContent: false,
      text: "",
      entities: [],
      metadata: {
        pageNumber: 0,
        regionId: null
      },
      layoutSource: null,
      contentSource: null
    });
    expect(createdRegion.bbox.x1).toBeLessThan(createdRegion.bbox.x2);
    expect(createdRegion.bbox.y1).toBeLessThan(createdRegion.bbox.y2);

    onOverlayDocumentSaved.mockClear();
    onOverlayEditStarted.mockClear();
    rerender(
      <PdfViewerTab
        storageService={storage}
        overlayDocument={createdDocument}
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );

    const editButtons = screen.getAllByRole("button", { name: "Edit Text region" });
    expect(editButtons).toHaveLength(2);
    await user.click(editButtons[1]);
    expect(screen.getByRole("heading", { name: "Edit Region" })).toBeInTheDocument();
    setEditorText(screen.getByRole("textbox", { name: "Text" }), "newly created region");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onOverlayEditStarted).toHaveBeenCalledTimes(1);
    expect(onOverlayDocumentSaved).toHaveBeenCalledTimes(1);
    const savedCreatedDocument = onOverlayDocumentSaved.mock.calls[0][0] as OverlayDocument;
    expect(savedCreatedDocument.pages[0].regions[1].text).toBe("newly created region");
  });

  it("does not create bbox when Add BBox drag is smaller than minimum size", async () => {
    const user = userEvent.setup();
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
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    );
    await uploadPdf(container, file);

    await screen.findByText(/overlays/i);
    await waitForPageRender();
    setStageRect();

    await user.click(screen.getByRole("button", { name: "Add BBox" }));
    const createSurface = screen.getByLabelText("Create bbox surface");
    fireEvent.pointerDown(createSurface, { pointerId: 12, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { pointerId: 12, clientX: 202, clientY: 202 });
    fireEvent.pointerUp(window, { pointerId: 12, clientX: 202, clientY: 202 });

    expect(onOverlayEditStarted).not.toHaveBeenCalled();
    expect(onOverlayDocumentSaved).not.toHaveBeenCalled();
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
