import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_META } from "./appMeta";
import {
  canRedoHistory,
  canUndoHistory,
  commitHistory,
  createHistoryState,
  redoHistory,
  replacePresentHistory,
  undoHistory
} from "./shared/history/history";
import { annotationService } from "./services/annotationService";
import { jsonService } from "./services/jsonService";
import { SetupTab } from "./setup/components/SetupTab";
import { Header } from "./shared/components/Header";
import type { AppTab } from "./shared/components/TabNav";
import type { OverlayDocument, OverlayEditSession, OverlayLoadPayload } from "./types/overlay";
import type { AnnotationService, JsonService } from "./types/services";
import { PdfViewerTab } from "./viewer/components/PdfViewerTab";

interface AppProps {
  services?: {
    jsonService?: JsonService;
    annotationService?: AnnotationService;
  };
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"]'));
}

export default function App({ services }: AppProps) {
  const [activeTab, setActiveTab] = useState<AppTab>("viewer");
  const setupGenerateHandlerRef = useRef<(() => void) | null>(null);
  const [overlayHistory, setOverlayHistory] = useState(() =>
    createHistoryState<OverlayEditSession | null>(null, {
      meta: { action: "init" }
    })
  );

  const resolvedJsonService = useMemo(
    () => services?.jsonService ?? jsonService,
    [services?.jsonService]
  );
  const resolvedAnnotationService = useMemo(
    () => services?.annotationService ?? annotationService,
    [services?.annotationService]
  );
  const overlaySession = overlayHistory.present.state;
  const setupOverlaySession = activeTab === "setup" ? overlaySession : null;
  const canUndoOverlay = canUndoHistory(overlayHistory);
  const canRedoOverlay = canRedoHistory(overlayHistory);
  const canManualSaveOverlay = Boolean(overlaySession);

  const areOverlaySessionsEqual = useCallback(
    (left: OverlayEditSession | null, right: OverlayEditSession | null): boolean => {
      if (left === right) {
        return true;
      }

      if (!left || !right) {
        return left === right;
      }

      return (
        left.document === right.document &&
        left.sourceRoot === right.sourceRoot &&
        left.sourceJsonRaw === right.sourceJsonRaw &&
        left.hasViewerChanges === right.hasViewerChanges &&
        left.saveState.isSaving === right.saveState.isSaving &&
        left.saveState.isSaved === right.saveState.isSaved &&
        left.saveState.lastSavedAt === right.saveState.lastSavedAt
      );
    },
    []
  );

  const commitOverlaySession = useCallback(
    (nextSession: OverlayEditSession | null, action: string) => {
      setOverlayHistory((previous) =>
        commitHistory(previous, nextSession, { action }, areOverlaySessionsEqual)
      );
    },
    [areOverlaySessionsEqual]
  );

  const handleLoadOverlays = useCallback((payload: OverlayLoadPayload) => {
    commitOverlaySession({
      ...payload,
      hasViewerChanges: false,
      saveState: {
        isSaving: false,
        isSaved: true,
        lastSavedAt: new Date().toISOString()
      }
    }, "setup-load-overlays");
    setActiveTab("viewer");
  }, [commitOverlaySession]);

  const handleClearOverlaySession = useCallback(() => {
    commitOverlaySession(null, "setup-clear-overlays");
  }, [commitOverlaySession]);

  const handleOverlayDocumentSaved = useCallback((nextDocument: OverlayDocument) => {
    setOverlayHistory((previousHistory) => {
      const previous = previousHistory.present.state;
      if (!previous) {
        return previousHistory;
      }
      return commitHistory(
        previousHistory,
        {
          ...previous,
          document: nextDocument,
          hasViewerChanges: true,
          saveState: {
            isSaving: false,
            isSaved: true,
            lastSavedAt: new Date().toISOString()
          }
        },
        { action: "viewer-overlay-document-saved" },
        areOverlaySessionsEqual
      );
    });
  }, [areOverlaySessionsEqual]);

  const markPresentOverlaySaved = useCallback(
    (history: typeof overlayHistory, action: string) => {
      const present = history.present.state;
      if (!present) {
        return history;
      }

      return replacePresentHistory(
        history,
        {
          ...present,
          saveState: {
            isSaving: false,
            isSaved: true,
            lastSavedAt: new Date().toISOString()
          }
        },
        { action },
        areOverlaySessionsEqual
      );
    },
    [areOverlaySessionsEqual]
  );

  const handleUndo = useCallback(() => {
    setOverlayHistory((previous) =>
      markPresentOverlaySaved(undoHistory(previous), "history-undo-autosave")
    );
  }, [markPresentOverlaySaved]);

  const handleRedo = useCallback(() => {
    setOverlayHistory((previous) =>
      markPresentOverlaySaved(redoHistory(previous), "history-redo-autosave")
    );
  }, [markPresentOverlaySaved]);

  const handleManualSave = useCallback(() => {
    setOverlayHistory((previous) =>
      markPresentOverlaySaved(previous, "header-manual-save")
    );
  }, [markPresentOverlaySaved]);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      const commandKey = event.ctrlKey || event.metaKey;
      if (!commandKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = key === "y" || (key === "z" && event.shiftKey);

      if (wantsUndo && canUndoOverlay) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (wantsRedo && canRedoOverlay) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [canRedoOverlay, canUndoOverlay, handleRedo, handleUndo]);

  const handleOverlayEditStarted = useCallback(() => {
    setOverlayHistory((previousHistory) => {
      const previous = previousHistory.present.state;
      if (!previous) {
        return previousHistory;
      }
      return replacePresentHistory(
        previousHistory,
        {
          ...previous,
          saveState: {
            ...previous.saveState,
            isSaving: true,
            isSaved: false
          }
        },
        { action: "viewer-overlay-edit-started" },
        areOverlaySessionsEqual
      );
    });
  }, [areOverlaySessionsEqual]);

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
    <div className="app-shell">
      <Header
        appMeta={APP_META}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onGenerateJson={handleGenerateJson}
        onManualSave={handleManualSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canManualSave={canManualSaveOverlay}
        canUndo={canUndoOverlay}
        canRedo={canRedoOverlay}
      />

      <main className="tab-panels">
        <section
          className="tab-panel"
          hidden={activeTab !== "viewer"}
          aria-hidden={activeTab !== "viewer"}
        >
          <PdfViewerTab
            overlayDocument={overlaySession?.document ?? null}
            overlaySaveState={overlaySession?.saveState ?? null}
            onOverlayEditStarted={handleOverlayEditStarted}
            onOverlayDocumentSaved={handleOverlayDocumentSaved}
          />
        </section>
        <section
          className="tab-panel"
          hidden={activeTab !== "setup"}
          aria-hidden={activeTab !== "setup"}
        >
          <SetupTab
            jsonService={resolvedJsonService}
            annotationService={resolvedAnnotationService}
            onLoadToViewer={handleLoadOverlays}
            overlaySession={setupOverlaySession}
            onClearOverlaySession={handleClearOverlaySession}
            onGenerateJsonRegister={handleSetupGenerateRegister}
          />
        </section>
      </main>
    </div>
  );
}
