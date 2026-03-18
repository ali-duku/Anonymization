import { memo, useCallback, useState } from "react";
import { PdfViewerTab } from "../../../viewer/components/PdfViewerTab/PdfViewerTab";
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
  const [inputValue, setInputValue] = useState("");
  const { state, requestDocument, retryLastRequest, resetRetrieval } = usePdfRetrieval({
    pdfRetrievalService,
    onDocumentRetrieved: () => {
      onClearOverlaySessionForDocumentSwitch?.();
    },
    onDocumentCleared: () => {
      onClearOverlaySessionForDocumentSwitch?.();
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
  }, [resetRetrieval]);

  return (
    <section className={styles.panel} aria-label="Viewer tab">
      <PdfViewerTab
        retrievedPdfDocument={state.document}
        retrievalInputValue={inputValue}
        retrievalStatus={state.status}
        retrievalErrorMessage={state.error?.message ?? null}
        canRetryRetrieval={Boolean(state.lastRequestedId) && state.status !== "loading"}
        onRetrievalInputChange={handleInputChange}
        onRetrieveDocument={handleSubmit}
        onResetRetrieval={handleReset}
        onRetryRetrieval={retryLastRequest}
        overlayDocument={overlayDocument}
        overlaySaveState={overlaySaveState}
        onOverlayEditStarted={onOverlayEditStarted}
        onOverlayDocumentSaved={onOverlayDocumentSaved}
      />
    </section>
  );
}

export const PdfWorkspaceTab = memo(PdfWorkspaceTabComponent);
