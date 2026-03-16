import { memo, useRef, useState, type ChangeEventHandler } from "react";
import type { OverlayEditSession, OverlayLoadPayload } from "../../types/overlay";
import type { AnnotationService, JsonService } from "../../types/services";

interface SetupTabProps {
  jsonService: JsonService;
  annotationService: AnnotationService;
  overlaySession: OverlayEditSession | null;
  onLoadToViewer: (payload: OverlayLoadPayload) => void;
  onClearOverlaySession: () => void;
}

function hasVisibleContent(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code !== 32 && code !== 9 && code !== 10 && code !== 13 && code !== 12 && code !== 11) {
      return true;
    }
  }
  return false;
}

function countLines(value: string): number {
  if (!value) {
    return 0;
  }

  let lines = 1;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 10) {
      lines += 1;
    }
  }
  return lines;
}

function SetupTabComponent({
  jsonService,
  annotationService,
  overlaySession,
  onLoadToViewer,
  onClearOverlaySession
}: SetupTabProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const outputRef = useRef<HTMLTextAreaElement | null>(null);
  const previousInputRef = useRef("");
  const [hasInput, setHasInput] = useState(false);
  const [hasOutput, setHasOutput] = useState(false);
  const [outputLineCount, setOutputLineCount] = useState(0);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const outputStats = hasOutput ? `${outputLineCount} lines generated` : "No generated JSON yet.";

  const handleGenerate = () => {
    const inputJson = inputRef.current?.value ?? "";
    setSuccessText(null);
    const result = overlaySession
      ? annotationService.generateWithOverlayEdits(overlaySession.sourceRoot, overlaySession.document)
      : jsonService.generate(inputJson);

    if (!result.success || !result.formattedJson) {
      const location = result.error?.line
        ? `Line ${result.error.line}, column ${result.error.column ?? "?"}. `
        : "";
      setErrorText(`${location}${result.error?.message ?? "Invalid JSON input."}`);
      return;
    }

    if (outputRef.current) {
      outputRef.current.value = result.formattedJson;
    }
    setHasOutput(true);
    setOutputLineCount(countLines(result.formattedJson));
    setErrorText(null);
    setSuccessText(overlaySession ? "JSON generated with overlay edits." : "JSON generated successfully.");
  };

  const handleCopy = async () => {
    const outputJson = outputRef.current?.value ?? "";
    setIsCopying(true);
    const copied = await jsonService.copyToClipboard(outputJson);
    setIsCopying(false);

    if (copied) {
      setErrorText(null);
      setSuccessText("Generated JSON copied to clipboard.");
    } else {
      setSuccessText(null);
      setErrorText("Copy failed. Check clipboard permissions and try again.");
    }
  };

  const handleLoadToViewer = () => {
    const inputJson = inputRef.current?.value ?? "";
    setSuccessText(null);
    const result = annotationService.parseOverlayInput(inputJson);

    if (!result.success || !result.document || !result.sourceRoot) {
      const location = result.error?.line
        ? `Line ${result.error.line}, column ${result.error.column ?? "?"}. `
        : "";
      setErrorText(`${location}${result.error?.message ?? "Could not load overlays from input JSON."}`);
      return;
    }

    onLoadToViewer({
      document: result.document,
      sourceRoot: result.sourceRoot,
      sourceJsonRaw: result.sourceJsonRaw
    });
    const regionCount = result.document.pages.reduce((total, page) => total + page.regions.length, 0);
    setErrorText(null);
    setSuccessText(`Loaded ${regionCount} overlays from ${result.document.pages.length} pages.`);
  };

  const handleInputChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
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
    }

    previousInputRef.current = nextValue;
    const nextHasInput = hasVisibleContent(nextValue);
    setHasInput((previous) => (previous === nextHasInput ? previous : nextHasInput));
  };

  return (
    <section className="panel setup-panel fade-in" aria-label="Setup tab">
      <header className="panel-header">
        <h2>Setup</h2>
      </header>

      <div className="json-grid">
        <div className="json-column">
          <label htmlFor="json-input">Input JSON</label>
          <textarea
            id="json-input"
            ref={inputRef}
            className="json-textarea"
            placeholder='Paste JSON here, for example: {"result":"..."}'
            defaultValue=""
            onChange={handleInputChange}
            wrap="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
          />
        </div>

        <div className="json-column">
          <label htmlFor="json-output">Generated JSON (read-only)</label>
          <textarea
            id="json-output"
            ref={outputRef}
            className="json-textarea output"
            readOnly
            defaultValue=""
            wrap="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="setup-actions">
        <button type="button" className="action-button" onClick={handleGenerate}>
          Generate JSON
        </button>
        <button
          type="button"
          className="action-button secondary"
          onClick={handleCopy}
          disabled={!hasOutput || isCopying}
        >
          Copy Output
        </button>
        <button
          type="button"
          className="action-button secondary"
          onClick={handleLoadToViewer}
          disabled={!hasInput}
        >
          Load to Viewer
        </button>
        <span className="setup-meta">{outputStats}</span>
      </div>

      <div className="status-region">
        {errorText ? (
          <p className="status-line error" role="alert">
            {errorText}
          </p>
        ) : successText ? (
          <p className="status-line success" role="status">
            {successText}
          </p>
        ) : (
          <p className="status-line placeholder" aria-hidden="true">
            &nbsp;
          </p>
        )}
      </div>
    </section>
  );
}

export const SetupTab = memo(SetupTabComponent);
