import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { OverlayDocument, OverlaySaveState } from "./types/overlay";
import type { AnnotationService, JsonService, StorageService } from "./types/services";

const mockViewerProps = vi.fn();

vi.mock("./viewer/components/PdfViewerTab", () => ({
  PdfViewerTab: (props: unknown) => {
    mockViewerProps(props);
    return <div>Viewer Placeholder</div>;
  }
}));

function getLatestViewerProps() {
  const calls = mockViewerProps.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0] as {
    overlayDocument: OverlayDocument | null;
    overlaySaveState: OverlaySaveState | null;
    onOverlayEditStarted: () => void;
    onOverlayDocumentSaved: (document: OverlayDocument) => void;
  };
}

function createOverlayDocument(): OverlayDocument {
  return {
    pages: [
      {
        pageNumber: 1,
        regions: [
          {
            id: "r-1",
            pageNumber: 1,
            label: "Text",
            bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
            matchedContent: true,
            text: "overlay text",
            metadata: { pageNumber: 1, regionId: 3 },
            layoutSource: { pageIndex: 0, regionIndex: 0 },
            contentSource: { pageIndex: 0, regionIndex: 0 }
          }
        ]
      }
    ]
  };
}

describe("App tab behavior", () => {
  beforeEach(() => {
    mockViewerProps.mockReset();
  });

  it("switches to viewer and forwards loaded overlays after setup load action", async () => {
    const user = userEvent.setup();

    const mockStorage: StorageService = {
      loadPdfRecord: vi.fn().mockResolvedValue(null),
      savePdfRecord: vi.fn().mockResolvedValue(undefined),
      replacePdf: vi.fn(),
      loadViewerState: vi.fn().mockResolvedValue(null),
      saveViewerState: vi.fn().mockResolvedValue(undefined),
      clearPdfRecord: vi.fn().mockResolvedValue(undefined)
    };

    const mockJson: JsonService = {
      generate: vi.fn((raw) => ({ success: true, formattedJson: raw })),
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };
    const overlayDocument = createOverlayDocument();
    const mockAnnotation: AnnotationService = {
      parseOverlayInput: vi.fn().mockReturnValue({
        success: true,
        document: overlayDocument,
        sourceRoot: {
          pipeline_steps: {
            layout_detection: [{ regions: [{ bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 }, label: "Text" }] }],
            content_extraction: [[{ bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 }, text: "overlay text" }]]
          }
        },
        sourceJsonRaw: '{"pipeline_steps":{}}'
      }),
      generateWithOverlayEdits: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" })
    };

    render(
      <App
        services={{
          storageService: mockStorage,
          jsonService: mockJson,
          annotationService: mockAnnotation
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Setup" }));
    fireEvent.change(screen.getByLabelText("Input JSON"), { target: { value: '{"load":true}' } });
    await user.click(screen.getByRole("button", { name: "Load to Viewer" }));

    expect(mockAnnotation.parseOverlayInput).toHaveBeenCalledWith('{"load":true}');
    await waitFor(() => {
      expect(mockViewerProps).toHaveBeenLastCalledWith(
        expect.objectContaining({
          overlayDocument,
          overlaySaveState: expect.objectContaining({
            isSaving: false,
            isSaved: true
          }),
          onOverlayEditStarted: expect.any(Function),
          onOverlayDocumentSaved: expect.any(Function)
        })
      );
    });
  });

  it("switches tabs and preserves setup state", async () => {
    const user = userEvent.setup();

    const mockStorage: StorageService = {
      loadPdfRecord: vi.fn().mockResolvedValue(null),
      savePdfRecord: vi.fn().mockResolvedValue(undefined),
      replacePdf: vi.fn(),
      loadViewerState: vi.fn().mockResolvedValue(null),
      saveViewerState: vi.fn().mockResolvedValue(undefined),
      clearPdfRecord: vi.fn().mockResolvedValue(undefined)
    };

    const mockJson: JsonService = {
      generate: vi.fn((raw) => ({ success: true, formattedJson: raw })),
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };
    const mockAnnotation: AnnotationService = {
      parseOverlayInput: vi.fn().mockReturnValue({
        success: true,
        document: createOverlayDocument(),
        sourceRoot: {
          pipeline_steps: {
            layout_detection: [{ regions: [] }],
            content_extraction: [[]]
          }
        },
        sourceJsonRaw: '{"pipeline_steps":{}}'
      }),
      generateWithOverlayEdits: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" })
    };

    render(
      <App
        services={{
          storageService: mockStorage,
          jsonService: mockJson,
          annotationService: mockAnnotation
        }}
      />
    );

    expect(screen.getByText("Viewer Placeholder")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Setup" }));
    const input = screen.getByLabelText("Input JSON");
    fireEvent.change(input, { target: { value: '{"persist":true}' } });

    await user.click(screen.getByRole("button", { name: "Viewer" }));
    await user.click(screen.getByRole("button", { name: "Setup" }));

    expect(screen.getByLabelText("Input JSON")).toHaveValue('{"persist":true}');
  });

  it("tracks viewer/save and setup load-clear transitions in app history", async () => {
    const user = userEvent.setup();

    const mockStorage: StorageService = {
      loadPdfRecord: vi.fn().mockResolvedValue(null),
      savePdfRecord: vi.fn().mockResolvedValue(undefined),
      replacePdf: vi.fn(),
      loadViewerState: vi.fn().mockResolvedValue(null),
      saveViewerState: vi.fn().mockResolvedValue(undefined),
      clearPdfRecord: vi.fn().mockResolvedValue(undefined)
    };

    const mockJson: JsonService = {
      generate: vi.fn((raw) => ({ success: true, formattedJson: raw })),
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };

    const baseDocument = createOverlayDocument();
    const editedDocument = {
      ...baseDocument,
      pages: [
        {
          ...baseDocument.pages[0],
          regions: [
            {
              ...baseDocument.pages[0].regions[0],
              text: "edited"
            }
          ]
        }
      ]
    } satisfies OverlayDocument;

    const mockAnnotation: AnnotationService = {
      parseOverlayInput: vi.fn().mockReturnValue({
        success: true,
        document: baseDocument,
        sourceRoot: {
          pipeline_steps: {
            layout_detection: [{ regions: [] }],
            content_extraction: [[]]
          }
        },
        sourceJsonRaw: '{"pipeline_steps":{}}'
      }),
      generateWithOverlayEdits: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" })
    };

    render(
      <App
        services={{
          storageService: mockStorage,
          jsonService: mockJson,
          annotationService: mockAnnotation
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Setup" }));
    fireEvent.change(screen.getByLabelText("Input JSON"), { target: { value: '{"load":true}' } });
    await user.click(screen.getByRole("button", { name: "Load to Viewer" }));

    await waitFor(() => {
      const props = getLatestViewerProps();
      expect(props.overlayDocument).toEqual(baseDocument);
    });

    let props = getLatestViewerProps();
    props.onOverlayEditStarted();
    props.onOverlayDocumentSaved(editedDocument);

    await waitFor(() => {
      const latest = getLatestViewerProps();
      expect(latest.overlayDocument).toEqual(editedDocument);
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Setup" }));
    fireEvent.change(screen.getByLabelText("Input JSON"), { target: { value: '{"clear":true}' } });

    await waitFor(() => {
      expect(getLatestViewerProps().overlayDocument).toEqual(null);
    });

    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      const latest = getLatestViewerProps();
      expect(latest.overlayDocument).toEqual(editedDocument);
      expect(latest.overlaySaveState).toEqual(
        expect.objectContaining({
          isSaving: false,
          isSaved: true,
          lastSavedAt: expect.any(String)
        })
      );
    });

    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      const latest = getLatestViewerProps();
      expect(latest.overlayDocument).toEqual(baseDocument);
      expect(latest.overlaySaveState).toEqual(
        expect.objectContaining({
          isSaving: false,
          isSaved: true,
          lastSavedAt: expect.any(String)
        })
      );
    });

    await user.click(screen.getByRole("button", { name: "Redo" }));
    await waitFor(() => {
      const latest = getLatestViewerProps();
      expect(latest.overlayDocument).toEqual(editedDocument);
      expect(latest.overlaySaveState).toEqual(
        expect.objectContaining({
          isSaving: false,
          isSaved: true,
          lastSavedAt: expect.any(String)
        })
      );
    });

    confirmSpy.mockRestore();
  });

  it("supports keyboard undo/redo globally and skips editable fields", async () => {
    const user = userEvent.setup();

    const mockStorage: StorageService = {
      loadPdfRecord: vi.fn().mockResolvedValue(null),
      savePdfRecord: vi.fn().mockResolvedValue(undefined),
      replacePdf: vi.fn(),
      loadViewerState: vi.fn().mockResolvedValue(null),
      saveViewerState: vi.fn().mockResolvedValue(undefined),
      clearPdfRecord: vi.fn().mockResolvedValue(undefined)
    };

    const mockJson: JsonService = {
      generate: vi.fn((raw) => ({ success: true, formattedJson: raw })),
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };

    const baseDocument = createOverlayDocument();
    const editedDocument = {
      ...baseDocument,
      pages: [
        {
          ...baseDocument.pages[0],
          regions: [
            {
              ...baseDocument.pages[0].regions[0],
              text: "edited-keyboard"
            }
          ]
        }
      ]
    } satisfies OverlayDocument;

    const mockAnnotation: AnnotationService = {
      parseOverlayInput: vi.fn().mockReturnValue({
        success: true,
        document: baseDocument,
        sourceRoot: {
          pipeline_steps: {
            layout_detection: [{ regions: [] }],
            content_extraction: [[]]
          }
        },
        sourceJsonRaw: '{"pipeline_steps":{}}'
      }),
      generateWithOverlayEdits: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" })
    };

    render(
      <App
        services={{
          storageService: mockStorage,
          jsonService: mockJson,
          annotationService: mockAnnotation
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Setup" }));
    fireEvent.change(screen.getByLabelText("Input JSON"), { target: { value: '{"load":true}' } });
    await user.click(screen.getByRole("button", { name: "Load to Viewer" }));

    await waitFor(() => {
      expect(getLatestViewerProps().overlayDocument).toEqual(baseDocument);
    });

    let props = getLatestViewerProps();
    props.onOverlayEditStarted();
    props.onOverlayDocumentSaved(editedDocument);

    await waitFor(() => {
      const latest = getLatestViewerProps();
      expect(latest.overlayDocument).toEqual(editedDocument);
    });

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => {
      expect(getLatestViewerProps().overlayDocument).toEqual(baseDocument);
    });

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    await waitFor(() => {
      expect(getLatestViewerProps().overlayDocument).toEqual(editedDocument);
    });

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => {
      expect(getLatestViewerProps().overlayDocument).toEqual(baseDocument);
    });

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    await waitFor(() => {
      expect(getLatestViewerProps().overlayDocument).toEqual(editedDocument);
    });

    await user.click(screen.getByRole("button", { name: "Setup" }));
    const input = screen.getByLabelText("Input JSON");
    (input as HTMLTextAreaElement).focus();

    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    await waitFor(() => {
      expect(getLatestViewerProps().overlayDocument).toEqual(editedDocument);
    });
  });

  it("manual top-bar save marks active overlay session as saved", async () => {
    const user = userEvent.setup();

    const mockStorage: StorageService = {
      loadPdfRecord: vi.fn().mockResolvedValue(null),
      savePdfRecord: vi.fn().mockResolvedValue(undefined),
      replacePdf: vi.fn(),
      loadViewerState: vi.fn().mockResolvedValue(null),
      saveViewerState: vi.fn().mockResolvedValue(undefined),
      clearPdfRecord: vi.fn().mockResolvedValue(undefined)
    };

    const mockJson: JsonService = {
      generate: vi.fn((raw) => ({ success: true, formattedJson: raw })),
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };

    const baseDocument = createOverlayDocument();
    const mockAnnotation: AnnotationService = {
      parseOverlayInput: vi.fn().mockReturnValue({
        success: true,
        document: baseDocument,
        sourceRoot: {
          pipeline_steps: {
            layout_detection: [{ regions: [] }],
            content_extraction: [[]]
          }
        },
        sourceJsonRaw: '{"pipeline_steps":{}}'
      }),
      generateWithOverlayEdits: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" })
    };

    render(
      <App
        services={{
          storageService: mockStorage,
          jsonService: mockJson,
          annotationService: mockAnnotation
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Setup" }));
    fireEvent.change(screen.getByLabelText("Input JSON"), { target: { value: '{"load":true}' } });
    await user.click(screen.getByRole("button", { name: "Load to Viewer" }));

    await waitFor(() => {
      const latest = getLatestViewerProps();
      expect(latest.overlayDocument).toEqual(baseDocument);
      expect(latest.overlaySaveState).toEqual(
        expect.objectContaining({
          isSaving: false,
          isSaved: true,
          lastSavedAt: expect.any(String)
        })
      );
    });

    const beforeSaveTimestamp = getLatestViewerProps().overlaySaveState?.lastSavedAt ?? null;
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const latest = getLatestViewerProps();
      expect(latest.overlaySaveState).toEqual(
        expect.objectContaining({
          isSaving: false,
          isSaved: true,
          lastSavedAt: expect.any(String)
        })
      );
    });

    const afterSaveTimestamp = getLatestViewerProps().overlaySaveState?.lastSavedAt ?? null;
    expect(afterSaveTimestamp).not.toBeNull();
    if (beforeSaveTimestamp !== null) {
      expect(new Date(afterSaveTimestamp as string).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeSaveTimestamp).getTime()
      );
    }
  });
});
