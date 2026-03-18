import { memo } from "react";
import { SetupFooterActions } from "../SetupFooterActions/SetupFooterActions";
import { SetupInputPane } from "../SetupInputPane/SetupInputPane";
import { SetupOutputPane } from "../SetupOutputPane/SetupOutputPane";
import { SetupStatusRegion } from "../SetupStatusRegion/SetupStatusRegion";
import { useSetupJsonWorkflow } from "../../hooks/useSetupJsonWorkflow";
import styles from "./SetupTab.module.css";
import type { SetupTabProps } from "./SetupTab.types";

function SetupTabComponent({
  jsonService,
  annotationService,
  overlaySession,
  onLoadToViewer,
  onClearOverlaySession,
  onGenerateJsonRegister
}: SetupTabProps) {
  const {
    inputRef,
    outputRef,
    hasInput,
    hasOutput,
    outputStats,
    loadStatusText,
    successText,
    errorText,
    isCopying,
    handleCopy,
    handleLoadToViewer,
    handleInputChange
  } = useSetupJsonWorkflow({
    jsonService,
    annotationService,
    overlaySession,
    onLoadToViewer,
    onClearOverlaySession,
    onGenerateJsonRegister
  });

  return (
    <section className={styles.panel} aria-label="Setup tab">
      <header className={styles.panelHeader}>
        <h2>Setup</h2>
      </header>

      <div className={styles.jsonGrid}>
        <SetupInputPane textareaRef={inputRef} onChange={handleInputChange} />
        <SetupOutputPane textareaRef={outputRef} />
      </div>

      <SetupFooterActions
        hasInput={hasInput}
        hasOutput={hasOutput}
        isCopying={isCopying}
        loadStatusText={loadStatusText}
        outputStats={outputStats}
        onLoadToViewer={handleLoadToViewer}
        onCopy={() => {
          void handleCopy();
        }}
      />

      <SetupStatusRegion successText={successText} errorText={errorText} />
    </section>
  );
}

export const SetupTab = memo(SetupTabComponent);
