import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEventHandler,
  type MutableRefObject
} from "react";
import type { OverlayEditSession, OverlayLoadPayload } from "../../../types/overlay";
import type { AnnotationService, JsonService } from "../../../types/services";
import { countLines, getJsonErrorMessage, hasVisibleContent } from "../utils/setupText";

interface UseSetupJsonWorkflowOptions {
  jsonService: JsonService;
  annotationService: AnnotationService;
  overlaySession: OverlayEditSession | null;
  onLoadToViewer: (payload: OverlayLoadPayload) => void;
  onClearOverlaySession: () => void;
  onGenerateJsonRegister?: (handler: (() => void) | null) => void;
}

interface SetupJsonWorkflow {
  inputRef: MutableRefObject<HTMLTextAreaElement | null>;
  outputRef: MutableRefObject<HTMLTextAreaElement | null>;
  hasInput: boolean;
  hasOutput: boolean;
  outputStats: string;
  loadStatusText: string;
  successText: string | null;
  errorText: string | null;
  isCopying: boolean;
  handleGenerate: () => void;
  handleCopy: () => Promise<void>;
  handleLoadToViewer: () => void;
  handleInputChange: ChangeEventHandler<HTMLTextAreaElement>;
}

export function useSetupJsonWorkflow({
  jsonService,
  annotationService,
  overlaySession,
  onLoadToViewer,
  onClearOverlaySession,
  onGenerateJsonRegister
}: UseSetupJsonWorkflowOptions): SetupJsonWorkflow {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const outputRef = useRef<HTMLTextAreaElement | null>(null);
  const previousInputRef = useRef("");
  const [hasInput, setHasInput] = useState(false);
  const [hasOutput, setHasOutput] = useState(false);
  const [outputLineCount, setOutputLineCount] = useState(0);
  const [loadStatusText, setLoadStatusText] = useState("");
  const [successText, setSuccessText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const outputStats = hasOutput ? `${outputLineCount} lines generated` : "No generated JSON yet.";

  const handleGenerate = useCallback(() => {
    const inputJson = inputRef.current?.value ?? "";
    setSuccessText(null);
    const result = overlaySession
      ? annotationService.generateWithOverlayEdits(overlaySession.sourceRoot, overlaySession.document)
      : jsonService.generate(inputJson);

    if (!result.success || !result.formattedJson) {
      setErrorText(getJsonErrorMessage(result.error?.message, result.error?.line, result.error?.column));
      return;
    }

    if (outputRef.current) {
      outputRef.current.value = result.formattedJson;
    }

    setHasOutput(true);
    setOutputLineCount(countLines(result.formattedJson));
    setErrorText(null);
    setSuccessText(overlaySession ? "JSON generated with overlay edits." : "JSON generated successfully.");
  }, [annotationService, jsonService, overlaySession]);

  useEffect(() => {
    onGenerateJsonRegister?.(handleGenerate);
    return () => {
      onGenerateJsonRegister?.(null);
    };
  }, [handleGenerate, onGenerateJsonRegister]);

  const handleCopy = useCallback(async () => {
    const outputJson = outputRef.current?.value ?? "";
    setIsCopying(true);
    const copied = await jsonService.copyToClipboard(outputJson);
    setIsCopying(false);

    if (copied) {
      setErrorText(null);
      setSuccessText("Generated JSON copied to clipboard.");
      return;
    }

    setSuccessText(null);
    setErrorText("Copy failed. Check clipboard permissions and try again.");
  }, [jsonService]);

  const handleLoadToViewer = useCallback(() => {
    if (overlaySession?.hasViewerChanges) {
      const shouldContinue = window.confirm(
        "You have viewer bbox/text edits on the currently loaded overlays. Loading new overlays will discard them. Continue?"
      );
      if (!shouldContinue) {
        return;
      }
    }

    const inputJson = inputRef.current?.value ?? "";
    setSuccessText(null);
    const result = annotationService.parseOverlayInput(inputJson);

    if (!result.success || !result.document || !result.sourceRoot) {
      setErrorText(
        getJsonErrorMessage(
          result.error?.message ?? "Could not load overlays from input JSON.",
          result.error?.line,
          result.error?.column
        )
      );
      return;
    }

    onLoadToViewer({
      document: result.document,
      sourceRoot: result.sourceRoot,
      sourceJsonRaw: result.sourceJsonRaw
    });

    const regionCount = result.document.pages.reduce((total, page) => total + page.regions.length, 0);
    setLoadStatusText(`Loaded ${regionCount} overlays from ${result.document.pages.length} pages.`);
    setErrorText(null);
    setSuccessText(null);
  }, [annotationService, onLoadToViewer, overlaySession?.hasViewerChanges]);

  const handleInputChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      const nextValue = event.currentTarget.value;
      const previousValue = previousInputRef.current;

      if (overlaySession && nextValue !== previousValue) {
        const shouldClear = window.confirm(
          "Changing Input JSON will clear loaded overlays and bbox edits. Continue?"
        );
        if (!shouldClear) {
          if (inputRef.current) {
            inputRef.current.value = previousValue;
          }
          return;
        }
        onClearOverlaySession();
        setLoadStatusText("");
      }

      previousInputRef.current = nextValue;
      const nextHasInput = hasVisibleContent(nextValue);
      setHasInput((previous) => (previous === nextHasInput ? previous : nextHasInput));
    },
    [onClearOverlaySession, overlaySession]
  );

  return {
    inputRef,
    outputRef,
    hasInput,
    hasOutput,
    outputStats,
    loadStatusText,
    successText,
    errorText,
    isCopying,
    handleGenerate,
    handleCopy,
    handleLoadToViewer,
    handleInputChange
  };
}
