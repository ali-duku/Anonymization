import { act, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OverlayDocument, OverlayEditSession, OverlayLoadPayload } from "../../types/overlay";
import type { AnnotationService, JsonService } from "../../types/services";
import { SetupTab } from "./SetupTab";

async function runRegisteredGenerate(handler: (() => void) | null): Promise<void> {
  expect(handler).toBeTypeOf("function");
  await act(async () => {
    handler?.();
  });
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
            text: "Sample text",
            entities: [],
            metadata: { pageNumber: 1, regionId: 7 },
            layoutSource: { pageIndex: 0, regionIndex: 0 },
            contentSource: { pageIndex: 0, regionIndex: 0 }
          }
        ]
      }
    ]
  };
}

function createOverlaySession(): OverlayEditSession {
  return {
    document: createOverlayDocument(),
    sourceJsonRaw: '{"pipeline_steps":{}}',
    sourceRoot: {
      pipeline_steps: {
        layout_detection: [{ regions: [{ bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 }, label: "Text" }] }],
        content_extraction: [
          [{ bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 }, text: "Sample text", region_label: "Text" }]
        ]
      }
    },
    saveState: {
      isSaving: false,
      isSaved: true,
      lastSavedAt: "2026-03-16T12:00:00.000Z"
    },
    hasViewerChanges: false
  };
}

function createAnnotationService(overrides?: Partial<AnnotationService>): AnnotationService {
  return {
    parseOverlayInput: vi.fn().mockReturnValue({
      success: true,
      document: createOverlayDocument(),
      sourceRoot: createOverlaySession().sourceRoot,
      sourceJsonRaw: '{"pipeline_steps":{}}'
    }),
    generateWithOverlayEdits: vi.fn().mockReturnValue({
      success: true,
      formattedJson: '{"patched":true}'
    }),
    ...overrides
  };
}

describe("SetupTab", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates JSON then copies output (no overlay session)", async () => {
    const user = userEvent.setup();
    const copyToClipboard = vi.fn().mockResolvedValue(true);
    const expectedFormatted = '{\n  "a": 1\n}';

    const mockJsonService: JsonService = {
      generate: vi.fn((raw) => ({
        success: true,
        formattedJson: JSON.stringify(JSON.parse(raw), null, 2)
      })),
      copyToClipboard
    };
    const annotationService = createAnnotationService();
    const onLoadToViewer = vi.fn<(payload: OverlayLoadPayload) => void>();
    const onClearOverlaySession = vi.fn();
    let triggerGenerate: (() => void) | null = null;

    const view = render(
      <SetupTab
        jsonService={mockJsonService}
        annotationService={annotationService}
        overlaySession={null}
        onLoadToViewer={onLoadToViewer}
        onClearOverlaySession={onClearOverlaySession}
        onGenerateJsonRegister={(handler) => {
          triggerGenerate = handler;
        }}
      />
    );

    expect(view.getByText("No generated JSON yet.")).toBeInTheDocument();

    const input = view.getByLabelText("Input JSON");
    fireEvent.change(input, { target: { value: '{"a":1}' } });
    await runRegisteredGenerate(triggerGenerate);

    await waitFor(() => {
      const output = view.getByLabelText("Generated JSON (read-only)");
      expect(output).toHaveValue(expectedFormatted);
      expect(view.getByText("3 lines generated")).toBeInTheDocument();
    });

    await user.click(view.getByRole("button", { name: "Copy Output" }));
    expect(copyToClipboard).toHaveBeenCalledWith(expectedFormatted);
    expect(view.getByText("Generated JSON copied to clipboard.")).toBeInTheDocument();
    expect(onLoadToViewer).not.toHaveBeenCalled();
    expect(annotationService.generateWithOverlayEdits).not.toHaveBeenCalled();
  });

  it("keeps previous output when generation fails", async () => {
    const generate = vi
      .fn()
      .mockReturnValueOnce({ success: true, formattedJson: '{"ok":true}' })
      .mockReturnValueOnce({
        success: false,
        formattedJson: "",
        error: { message: "Bad JSON", line: 1, column: 7 }
      });

    const mockJsonService: JsonService = {
      generate,
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };
    const annotationService = createAnnotationService();
    let triggerGenerate: (() => void) | null = null;

    const view = render(
      <SetupTab
        jsonService={mockJsonService}
        annotationService={annotationService}
        overlaySession={null}
        onLoadToViewer={vi.fn()}
        onClearOverlaySession={vi.fn()}
        onGenerateJsonRegister={(handler) => {
          triggerGenerate = handler;
        }}
      />
    );

    const input = view.getByLabelText("Input JSON");
    fireEvent.change(input, { target: { value: '{"ok":true}' } });
    await runRegisteredGenerate(triggerGenerate);
    await waitFor(() => {
      expect(view.getByLabelText("Generated JSON (read-only)")).toHaveValue('{"ok":true}');
    });

    fireEvent.change(input, { target: { value: '{"broken":}' } });
    await runRegisteredGenerate(triggerGenerate);

    await waitFor(() => {
      expect(view.getByLabelText("Generated JSON (read-only)")).toHaveValue('{"ok":true}');
      expect(view.getByRole("alert")).toHaveTextContent("Line 1, column 7. Bad JSON");
    });
  });

  it("loads overlays from the input JSON and calls viewer callback", async () => {
    const user = userEvent.setup();
    const parseOverlayInput = vi.fn().mockReturnValue({
      success: true,
      document: createOverlayDocument(),
      sourceRoot: createOverlaySession().sourceRoot,
      sourceJsonRaw: '{"pipeline_steps":{}}'
    });

    const mockJsonService: JsonService = {
      generate: vi.fn().mockReturnValue({ success: true, formattedJson: '{"generated":true}' }),
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };
    const annotationService = createAnnotationService({ parseOverlayInput });
    const onLoadToViewer = vi.fn<(payload: OverlayLoadPayload) => void>();

    const view = render(
      <SetupTab
        jsonService={mockJsonService}
        annotationService={annotationService}
        overlaySession={null}
        onLoadToViewer={onLoadToViewer}
        onClearOverlaySession={vi.fn()}
      />
    );

    fireEvent.change(view.getByLabelText("Input JSON"), { target: { value: '{"from":"input"}' } });
    await user.click(view.getByRole("button", { name: "Load to Viewer" }));

    expect(parseOverlayInput).toHaveBeenCalledWith('{"from":"input"}');
    expect(onLoadToViewer).toHaveBeenCalledTimes(1);
    expect(view.getByText("Loaded 1 overlays from 1 pages.")).toBeInTheDocument();
  });

  it("renders split footer lanes for load and output controls", () => {
    const view = render(
      <SetupTab
        jsonService={{
          generate: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" }),
          copyToClipboard: vi.fn().mockResolvedValue(true)
        }}
        annotationService={createAnnotationService()}
        overlaySession={null}
        onLoadToViewer={vi.fn()}
        onClearOverlaySession={vi.fn()}
      />
    );

    expect(view.getByRole("button", { name: "Load to Viewer" })).toBeInTheDocument();
    expect(view.getByRole("button", { name: "Copy Output" })).toBeInTheDocument();
    expect(view.getByText("No generated JSON yet.")).toBeInTheDocument();
  });

  it("prompts before Load to Viewer when current overlay session has viewer edits", async () => {
    const user = userEvent.setup();
    const overlaySession = {
      ...createOverlaySession(),
      hasViewerChanges: true
    };
    const parseOverlayInput = vi.fn().mockReturnValue({
      success: true,
      document: createOverlayDocument(),
      sourceRoot: createOverlaySession().sourceRoot,
      sourceJsonRaw: '{"pipeline_steps":{}}'
    });
    const confirmSpy = vi.spyOn(window, "confirm");
    const onLoadToViewer = vi.fn<(payload: OverlayLoadPayload) => void>();

    const baseProps = {
      jsonService: {
        generate: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" }),
        copyToClipboard: vi.fn().mockResolvedValue(true)
      },
      annotationService: createAnnotationService({ parseOverlayInput }),
      onLoadToViewer,
      onClearOverlaySession: vi.fn()
    };

    const view = render(
      <SetupTab
        jsonService={baseProps.jsonService}
        annotationService={baseProps.annotationService}
        overlaySession={null}
        onLoadToViewer={baseProps.onLoadToViewer}
        onClearOverlaySession={baseProps.onClearOverlaySession}
      />
    );

    const input = view.getByLabelText("Input JSON") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '{"from":"input"}' } });

    view.rerender(
      <SetupTab
        jsonService={baseProps.jsonService}
        annotationService={baseProps.annotationService}
        overlaySession={overlaySession}
        onLoadToViewer={baseProps.onLoadToViewer}
        onClearOverlaySession={baseProps.onClearOverlaySession}
      />
    );

    confirmSpy.mockReturnValueOnce(false);
    await user.click(view.getByRole("button", { name: "Load to Viewer" }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(parseOverlayInput).not.toHaveBeenCalled();
    expect(onLoadToViewer).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    await user.click(view.getByRole("button", { name: "Load to Viewer" }));
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(parseOverlayInput).toHaveBeenCalledWith('{"from":"input"}');
    expect(onLoadToViewer).toHaveBeenCalledTimes(1);
  });

  it("shows an error when overlay load parsing fails", async () => {
    const user = userEvent.setup();
    const parseOverlayInput = vi.fn().mockReturnValue({
      success: false,
      document: null,
      sourceRoot: null,
      sourceJsonRaw: '{"bad":true}',
      error: { message: "Missing pipeline_steps", line: 2, column: 3 }
    });

    const mockJsonService: JsonService = {
      generate: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" }),
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };
    const annotationService = createAnnotationService({ parseOverlayInput });
    const onLoadToViewer = vi.fn();

    const view = render(
      <SetupTab
        jsonService={mockJsonService}
        annotationService={annotationService}
        overlaySession={null}
        onLoadToViewer={onLoadToViewer}
        onClearOverlaySession={vi.fn()}
      />
    );

    fireEvent.change(view.getByLabelText("Input JSON"), { target: { value: '{"bad":true}' } });
    await user.click(view.getByRole("button", { name: "Load to Viewer" }));

    expect(onLoadToViewer).not.toHaveBeenCalled();
    expect(view.getByRole("alert")).toHaveTextContent("Line 2, column 3. Missing pipeline_steps");
  });

  it("uses overlay-session patching when generating", async () => {
    const overlaySession = createOverlaySession();
    const generate = vi.fn().mockReturnValue({ success: true, formattedJson: '{"fallback":true}' });
    const mockJsonService: JsonService = {
      generate,
      copyToClipboard: vi.fn().mockResolvedValue(true)
    };
    const generateWithOverlayEdits = vi.fn().mockReturnValue({
      success: true,
      formattedJson: '{"patched":true}'
    });
    const annotationService = createAnnotationService({ generateWithOverlayEdits });
    let triggerGenerate: (() => void) | null = null;

    const view = render(
      <SetupTab
        jsonService={mockJsonService}
        annotationService={annotationService}
        overlaySession={overlaySession}
        onLoadToViewer={vi.fn()}
        onClearOverlaySession={vi.fn()}
        onGenerateJsonRegister={(handler) => {
          triggerGenerate = handler;
        }}
      />
    );

    await runRegisteredGenerate(triggerGenerate);

    await waitFor(() => {
      expect(generateWithOverlayEdits).toHaveBeenCalledWith(overlaySession.sourceRoot, overlaySession.document);
      expect(generate).not.toHaveBeenCalled();
      expect(view.getByLabelText("Generated JSON (read-only)")).toHaveValue('{"patched":true}');
      expect(view.getByRole("status")).toHaveTextContent("JSON generated with overlay edits.");
      expect(view.getByLabelText("Input JSON")).toHaveValue("");
    });
  });

  it("configures JSON textareas for large payload performance", () => {
    const view = render(
      <SetupTab
        jsonService={{
          generate: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" }),
          copyToClipboard: vi.fn().mockResolvedValue(true)
        }}
        annotationService={createAnnotationService()}
        overlaySession={null}
        onLoadToViewer={vi.fn()}
        onClearOverlaySession={vi.fn()}
      />
    );

    const input = view.getByLabelText("Input JSON");
    const output = view.getByLabelText("Generated JSON (read-only)");

    expect(input).toHaveAttribute("wrap", "off");
    expect(output).toHaveAttribute("wrap", "off");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(output).toHaveAttribute("autocomplete", "off");
  });

  it("confirms before clearing overlays when input changes, and cancels cleanly", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const overlaySession = createOverlaySession();
    const onClearOverlaySession = vi.fn();

    const baseProps = {
      jsonService: {
        generate: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" }),
        copyToClipboard: vi.fn().mockResolvedValue(true)
      },
      annotationService: createAnnotationService(),
      onLoadToViewer: vi.fn(),
      onClearOverlaySession
    };

    const view = render(
      <SetupTab
        jsonService={baseProps.jsonService}
        annotationService={baseProps.annotationService}
        overlaySession={null}
        onLoadToViewer={baseProps.onLoadToViewer}
        onClearOverlaySession={baseProps.onClearOverlaySession}
      />
    );

    const input = view.getByLabelText("Input JSON") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '{"base":1}' } });

    view.rerender(
      <SetupTab
        jsonService={baseProps.jsonService}
        annotationService={baseProps.annotationService}
        overlaySession={overlaySession}
        onLoadToViewer={baseProps.onLoadToViewer}
        onClearOverlaySession={baseProps.onClearOverlaySession}
      />
    );

    fireEvent.change(input, { target: { value: '{"new":2}' } });

    expect(confirmSpy).toHaveBeenCalled();
    expect(onClearOverlaySession).not.toHaveBeenCalled();
    expect(view.getByLabelText("Input JSON")).toHaveValue('{"base":1}');
  });

  it("clears overlays after confirmation and accepts new input", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const overlaySession = createOverlaySession();
    const onClearOverlaySession = vi.fn();

    const baseProps = {
      jsonService: {
        generate: vi.fn().mockReturnValue({ success: true, formattedJson: "{}" }),
        copyToClipboard: vi.fn().mockResolvedValue(true)
      },
      annotationService: createAnnotationService(),
      onLoadToViewer: vi.fn(),
      onClearOverlaySession
    };

    const view = render(
      <SetupTab
        jsonService={baseProps.jsonService}
        annotationService={baseProps.annotationService}
        overlaySession={null}
        onLoadToViewer={baseProps.onLoadToViewer}
        onClearOverlaySession={baseProps.onClearOverlaySession}
      />
    );

    const input = view.getByLabelText("Input JSON") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '{"base":1}' } });

    view.rerender(
      <SetupTab
        jsonService={baseProps.jsonService}
        annotationService={baseProps.annotationService}
        overlaySession={overlaySession}
        onLoadToViewer={baseProps.onLoadToViewer}
        onClearOverlaySession={baseProps.onClearOverlaySession}
      />
    );

    fireEvent.change(input, { target: { value: '{"new":2}' } });

    expect(confirmSpy).toHaveBeenCalled();
    expect(onClearOverlaySession).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText("Input JSON")).toHaveValue('{"new":2}');
  });
});
