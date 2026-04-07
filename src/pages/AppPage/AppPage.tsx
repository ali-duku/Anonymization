import {
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useRef,
  useState
} from "react";
import { APP_META } from "../../appMeta";
import { annotationService } from "../../services/annotationService";
import { jsonService } from "../../services/jsonService";
import {
  ENTITY_PROFILE_OPTIONS,
  getAnonymizationEntityLabels,
  getDefaultAnonymizationEntityLabel
} from "../../constants/anonymizationEntities";
import { pdfRetrievalService } from "../../features/pdf/services/pdfRetrievalService";
import { Header } from "../../components/general/Header/Header";
import type { AppTab } from "../../components/general/TabNav/TabNav.types";
import type { OverlayLoadPayload } from "../../types/overlay";
import { useDisplaySettings } from "../../features/settings/hooks/useDisplaySettings";
import { useOverlayBeforeUnloadPrompt } from "./useOverlayBeforeUnloadPrompt";
import { useOverlayHistoryShortcuts } from "./useOverlayHistoryShortcuts";
import { useOverlaySessionHistory } from "./useOverlaySessionHistory";
import styles from "./AppPage.module.css";
import type { AppPageProps } from "./AppPage.types";

const LazySetupTab = lazy(async () => {
  const module = await import("../../features/setup/components/SetupTab/SetupTab");
  return { default: module.SetupTab };
});

const LazyPdfWorkspaceTab = lazy(async () => {
  const module = await import("../../features/pdf/components/PdfWorkspaceTab/PdfWorkspaceTab");
  return { default: module.PdfWorkspaceTab };
});

export function AppPage({ services }: AppPageProps) {
  const [activeTab, setActiveTab] = useState<AppTab>("viewer");
  const setupGenerateHandlerRef = useRef<(() => void) | null>(null);
  const {
    settings,
    setFontSize,
    setActiveEntityProfileId,
    setDefaultTextDirection,
    setIsBboxStructuralEditingEnabled
  } = useDisplaySettings();

  const {
    overlaySession,
    canUndoOverlay,
    canRedoOverlay,
    canManualSaveOverlay,
    currentHistoryAction,
    nextRedoHistoryAction,
    setActivePdfIdentityKey,
    loadOverlayPayload,
    clearOverlaySession,
    saveOverlayDocument,
    markOverlayEditStarted,
    markOverlayGenerated,
    undoOverlay,
    redoOverlay,
    manualSaveOverlay
  } = useOverlaySessionHistory();

  const resolvedPdfRetrievalService = useMemo(
    () => services?.pdfRetrievalService ?? pdfRetrievalService,
    [services?.pdfRetrievalService]
  );
  const resolvedJsonService = useMemo(
    () => services?.jsonService ?? jsonService,
    [services?.jsonService]
  );
  const resolvedAnnotationService = useMemo(
    () => services?.annotationService ?? annotationService,
    [services?.annotationService]
  );

  const setupOverlaySession = activeTab === "setup" ? overlaySession : null;
  const activeAnonymizationEntityLabels = useMemo(
    () => getAnonymizationEntityLabels(settings.activeEntityProfileId),
    [settings.activeEntityProfileId]
  );
  const defaultAnonymizationEntityLabel = useMemo(
    () => getDefaultAnonymizationEntityLabel(settings.activeEntityProfileId),
    [settings.activeEntityProfileId]
  );

  useOverlayHistoryShortcuts({
    canUndo: canUndoOverlay,
    canRedo: canRedoOverlay,
    currentHistoryAction,
    nextRedoHistoryAction,
    onUndo: undoOverlay,
    onRedo: redoOverlay
  });
  useOverlayBeforeUnloadPrompt(overlaySession);

  const handleLoadOverlays = useCallback(
    (payload: OverlayLoadPayload) => {
      loadOverlayPayload(payload);
      setActiveTab("viewer");
    },
    [loadOverlayPayload]
  );

  const handleClearOverlaySession = useCallback(() => {
    clearOverlaySession();
  }, [clearOverlaySession]);

  const handleSetupGenerateRegister = useCallback((handler: (() => void) | null) => {
    setupGenerateHandlerRef.current = handler;
  }, []);

  const handleGenerateJson = useCallback(() => {
    if (activeTab !== "setup") {
      setActiveTab("setup");
      queueMicrotask(() => {
        setupGenerateHandlerRef.current?.();
      });
      return;
    }
    setupGenerateHandlerRef.current?.();
  }, [activeTab]);

  return (
    <div className={styles.appShell}>
      <Header
        appMeta={APP_META}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onGenerateJson={handleGenerateJson}
        onManualSave={manualSaveOverlay}
        onUndo={undoOverlay}
        onRedo={redoOverlay}
        fontSize={settings.fontSize}
        onFontSizeChange={setFontSize}
        activeEntityProfileId={settings.activeEntityProfileId}
        entityProfileOptions={ENTITY_PROFILE_OPTIONS}
        onActiveEntityProfileChange={setActiveEntityProfileId}
        defaultTextDirection={settings.defaultTextDirection}
        onToggleDefaultTextDirection={() => {
          setDefaultTextDirection(settings.defaultTextDirection === "rtl" ? "ltr" : "rtl");
        }}
        isBboxStructuralEditingEnabled={settings.isBboxStructuralEditingEnabled}
        onToggleBboxStructuralEditing={() => {
          setIsBboxStructuralEditingEnabled(!settings.isBboxStructuralEditingEnabled);
        }}
        canManualSave={canManualSaveOverlay}
        canUndo={canUndoOverlay}
        canRedo={canRedoOverlay}
      />

      <main className={styles.tabPanels}>
        <section
          className={styles.tabPanel}
          hidden={activeTab !== "viewer"}
          aria-hidden={activeTab !== "viewer"}
        >
          <Suspense fallback={null}>
            <LazyPdfWorkspaceTab
              pdfRetrievalService={resolvedPdfRetrievalService}
              overlayDocument={overlaySession?.document ?? null}
              overlaySaveState={overlaySession?.saveState ?? null}
              anonymizationEntityLabels={activeAnonymizationEntityLabels}
              defaultAnonymizationEntityLabel={defaultAnonymizationEntityLabel}
              defaultTextDirection={settings.defaultTextDirection}
              isBboxStructuralEditingEnabled={settings.isBboxStructuralEditingEnabled}
              onOverlayEditStarted={markOverlayEditStarted}
              onOverlayDocumentSaved={saveOverlayDocument}
              onActivePdfIdentityChange={setActivePdfIdentityKey}
            />
          </Suspense>
        </section>

        <section
          className={styles.tabPanel}
          hidden={activeTab !== "setup"}
          aria-hidden={activeTab !== "setup"}
        >
          <Suspense fallback={null}>
            <LazySetupTab
              jsonService={resolvedJsonService}
              annotationService={resolvedAnnotationService}
              onLoadToViewer={handleLoadOverlays}
              overlaySession={setupOverlaySession}
              onClearOverlaySession={handleClearOverlaySession}
              onOverlayGenerated={markOverlayGenerated}
              onGenerateJsonRegister={handleSetupGenerateRegister}
            />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
