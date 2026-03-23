import { memo, useCallback, useMemo, useState } from "react";
import { PdfViewerTab } from "../../../viewer/components/PdfViewerTab/PdfViewerTab";
import { useManualPdfBypass } from "../../hooks/useManualPdfBypass";
import { usePdfRetrieval } from "../../hooks/usePdfRetrieval";
import styles from "./PdfWorkspaceTab.module.css";
import type { PdfWorkspaceTabProps } from "./PdfWorkspaceTab.types";

function PdfWorkspaceTabComponent({
  pdfRetrievalService,
  overlayDocument = null,
  overlaySaveState = null,
  onOverlayEditStarted,
  onOverlayDocumentSaved,
  onClearOverlaySessionForDocumentSwitch
}: PdfWorkspaceTabProps) {
  const [activeSource, setActiveSource] = useState<"none" | "retrieval" | "manual">("none");
  const [inputValue, setInputValue] = useState("");
  const { state, requestDocument, retryLastRequest, resetRetrieval } = usePdfRetrieval({
    pdfRetrievalService,
    onDocumentRetrieved: () => {
      setActiveSource("retrieval");
      onClearOverlaySessionForDocumentSwitch?.();
    },
    onDocumentCleared: () => {
      setActiveSource((previous) => (previous === "retrieval" ? "none" : previous));
    }
  });
  const manualBypass = useManualPdfBypass({
    onDocumentLoaded: () => {
      setActiveSource("manual");
      onClearOverlaySessionForDocumentSwitch?.();
    },
    onDocumentCleared: () => {
      setActiveSource((previous) => (previous === "manual" ? "none" : previous));
    }
  });

  const handleInputChange = useCallback((nextValue: string) => {
    setInputValue(nextValue);
  }, []);

  const handleSubmit = useCallback(() => {
    void requestDocument(inputValue);
  }, [inputValue, requestDocument]);

  const handleReset = useCallback(() => {
    setInputValue("");
    resetRetrieval();
    manualBypass.resetManualDocument();
    setActiveSource("none");
    onClearOverlaySessionForDocumentSwitch?.();
  }, [manualBypass, onClearOverlaySessionForDocumentSwitch, resetRetrieval]);

  const activeDocument = useMemo(() => {
    if (activeSource === "manual") {
      return manualBypass.document;
    }
    if (activeSource === "retrieval") {
      return state.document;
    }
    return null;
  }, [activeSource, manualBypass.document, state.document]);

  const manualUploadStatusText = useMemo(() => {
    if (manualBypass.status === "error") {
      return manualBypass.errorMessage ?? "Manual upload failed.";
    }
    if (manualBypass.status === "success" && activeSource === "manual") {
      return `Manual PDF loaded: ${manualBypass.document?.meta.fileName ?? "file"}`;
    }
    return "";
  }, [activeSource, manualBypass.document, manualBypass.errorMessage, manualBypass.status]);

  const manualUploadStatusTone =
    manualBypass.status === "error" ? "error" : manualBypass.status === "success" ? "success" : "neutral";

  return (
    <section className={styles.panel} aria-label="Viewer tab">
      <PdfViewerTab
        retrievedPdfDocument={activeDocument}
        retrievalInputValue={inputValue}
        retrievalStatus={state.status}
        retrievalErrorMessage={state.error?.message ?? null}
        canRetryRetrieval={Boolean(state.lastRequestedId) && state.status !== "loading"}
        onRetrievalInputChange={handleInputChange}
        onRetrieveDocument={handleSubmit}
        onResetRetrieval={handleReset}
        onRetryRetrieval={retryLastRequest}
        manualFileInputRef={manualBypass.fileInputRef}
        onManualFilePick={manualBypass.handleFilePick}
        onManualFileChange={manualBypass.handleFileChange}
        manualUploadStatusText={manualUploadStatusText}
        manualUploadStatusTone={manualUploadStatusTone}
        overlayDocument={overlayDocument}
        overlaySaveState={overlaySaveState}
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    </section>
  );
}

export const PdfWorkspaceTab = memo(PdfWorkspaceTabComponent);
