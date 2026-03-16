import { useCallback, useMemo, useState } from "react";
import { APP_META } from "./appMeta";
import { annotationService } from "./services/annotationService";
import { jsonService } from "./services/jsonService";
import { storageService } from "./services/indexedDbStorageService";
import { SetupTab } from "./setup/components/SetupTab";
import { Header } from "./shared/components/Header";
import type { AppTab } from "./shared/components/TabNav";
import type { OverlayDocument, OverlayEditSession, OverlayLoadPayload } from "./types/overlay";
import type { AnnotationService, JsonService, StorageService } from "./types/services";
import { PdfViewerTab } from "./viewer/components/PdfViewerTab";

interface AppProps {
  services?: {
    storageService?: StorageService;
    jsonService?: JsonService;
    annotationService?: AnnotationService;
  };
}

export default function App({ services }: AppProps) {
  const [activeTab, setActiveTab] = useState<AppTab>("viewer");
  const [overlaySession, setOverlaySession] = useState<OverlayEditSession | null>(null);

  const resolvedStorageService = useMemo(
    () => services?.storageService ?? storageService,
    [services?.storageService]
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

  const handleLoadOverlays = useCallback((payload: OverlayLoadPayload) => {
    setOverlaySession({
      ...payload,
      saveState: {
        isSaving: false,
        isSaved: true,
        lastSavedAt: new Date().toISOString()
      }
    });
    setActiveTab("viewer");
  }, []);

  const handleClearOverlaySession = useCallback(() => {
    setOverlaySession(null);
  }, []);

  const handleOverlayEditStarted = useCallback(() => {
    setOverlaySession((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        saveState: {
          ...previous.saveState,
          isSaving: true,
          isSaved: false
        }
      };
    });
  }, []);

  const handleOverlayDocumentSaved = useCallback((nextDocument: OverlayDocument) => {
    setOverlaySession((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        document: nextDocument,
        saveState: {
          isSaving: false,
          isSaved: true,
          lastSavedAt: new Date().toISOString()
        }
      };
    });
  }, []);

  return (
    <div className="app-shell">
      <Header appMeta={APP_META} activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="tab-panels">
        <section
          className="tab-panel"
          hidden={activeTab !== "viewer"}
          aria-hidden={activeTab !== "viewer"}
        >
          <PdfViewerTab
            storageService={resolvedStorageService}
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
          />
        </section>
      </main>
    </div>
  );
}
