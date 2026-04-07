import { useCallback, useMemo, useRef, useState } from "react";
import {
  canRedoHistory,
  canUndoHistory,
  commitHistory,
  createHistoryState,
  redoHistory,
  replacePresentHistory,
  undoHistory
} from "../../utils/history";
import type { HistoryState } from "../../types/history";
import type { OverlayDocument, OverlayEditSession, OverlayLoadPayload } from "../../types/overlay";
import {
  loadPersistedOverlaySession,
  persistOverlaySession,
  removePersistedOverlaySession
} from "./overlaySessionStorage";

interface UseOverlaySessionHistoryResult {
  overlaySession: OverlayEditSession | null;
  canUndoOverlay: boolean;
  canRedoOverlay: boolean;
  canManualSaveOverlay: boolean;
  activePdfIdentityKey: string | null;
  setActivePdfIdentityKey: (nextPdfIdentityKey: string | null) => void;
  loadOverlayPayload: (payload: OverlayLoadPayload) => void;
  clearOverlaySession: () => void;
  saveOverlayDocument: (nextDocument: OverlayDocument) => void;
  markOverlayEditStarted: () => void;
  undoOverlay: () => void;
  redoOverlay: () => void;
  manualSaveOverlay: () => void;
}

function markPresentOverlaySaved(
  history: HistoryState<OverlayEditSession | null>,
  action: string,
  isEqual: (left: OverlayEditSession | null, right: OverlayEditSession | null) => boolean
): HistoryState<OverlayEditSession | null> {
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
    isEqual
  );
}

export function useOverlaySessionHistory(): UseOverlaySessionHistoryResult {
  const activePdfIdentityKeyRef = useRef<string | null>(null);
  const [activePdfIdentityKey, setActivePdfIdentityKeyState] = useState<string | null>(null);
  const [overlayHistory, setOverlayHistory] = useState(() =>
    createHistoryState<OverlayEditSession | null>(null, {
      meta: { action: "init" }
    })
  );

  const overlaySession = overlayHistory.present.state;
  const canUndoOverlay = canUndoHistory(overlayHistory);
  const canRedoOverlay = canRedoHistory(overlayHistory);
  const canManualSaveOverlay = Boolean(overlaySession);

  const setOverlayHistoryWithPersistence = useCallback(
    (updater: (previous: HistoryState<OverlayEditSession | null>) => HistoryState<OverlayEditSession | null>) => {
      setOverlayHistory((previous) => {
        const next = updater(previous);
        const activeIdentity = activePdfIdentityKeyRef.current;
        const persistedSession = next.present.state;
        if (activeIdentity && persistedSession) {
          persistOverlaySession(activeIdentity, persistedSession);
        } else if (activeIdentity && !persistedSession) {
          removePersistedOverlaySession(activeIdentity);
        }
        return next;
      });
    },
    []
  );

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
      setOverlayHistoryWithPersistence((previous) =>
        commitHistory(previous, nextSession, { action }, areOverlaySessionsEqual)
      );
    },
    [areOverlaySessionsEqual, setOverlayHistoryWithPersistence]
  );

  const setActivePdfIdentityKey = useCallback(
    (nextPdfIdentityKey: string | null) => {
      if (activePdfIdentityKeyRef.current === nextPdfIdentityKey) {
        return;
      }

      activePdfIdentityKeyRef.current = nextPdfIdentityKey;
      setActivePdfIdentityKeyState(nextPdfIdentityKey);

      setOverlayHistoryWithPersistence(() => {
        if (!nextPdfIdentityKey) {
          return createHistoryState<OverlayEditSession | null>(null, {
            meta: { action: "viewer-document-switch-reset" }
          });
        }

        const restoredSession = loadPersistedOverlaySession(nextPdfIdentityKey);
        return createHistoryState<OverlayEditSession | null>(restoredSession, {
          meta: {
            action: restoredSession ? "viewer-document-switch-restore" : "viewer-document-switch-reset"
          }
        });
      });
    },
    [setOverlayHistoryWithPersistence]
  );

  const loadOverlayPayload = useCallback(
    (payload: OverlayLoadPayload) => {
      commitOverlaySession(
        {
          ...payload,
          hasViewerChanges: false,
          saveState: {
            isSaving: false,
            isSaved: true,
            lastSavedAt: new Date().toISOString()
          }
        },
        "setup-load-overlays"
      );
    },
    [commitOverlaySession]
  );

  const clearOverlaySession = useCallback(() => {
    commitOverlaySession(null, "setup-clear-overlays");
  }, [commitOverlaySession]);

  const saveOverlayDocument = useCallback(
    (nextDocument: OverlayDocument) => {
      setOverlayHistoryWithPersistence((previousHistory) => {
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
    },
    [areOverlaySessionsEqual, setOverlayHistoryWithPersistence]
  );

  const markOverlayEditStarted = useCallback(() => {
    setOverlayHistoryWithPersistence((previousHistory) => {
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
  }, [areOverlaySessionsEqual, setOverlayHistoryWithPersistence]);

  const undoOverlay = useCallback(() => {
    setOverlayHistoryWithPersistence((previous) =>
      markPresentOverlaySaved(undoHistory(previous), "history-undo-autosave", areOverlaySessionsEqual)
    );
  }, [areOverlaySessionsEqual, setOverlayHistoryWithPersistence]);

  const redoOverlay = useCallback(() => {
    setOverlayHistoryWithPersistence((previous) =>
      markPresentOverlaySaved(redoHistory(previous), "history-redo-autosave", areOverlaySessionsEqual)
    );
  }, [areOverlaySessionsEqual, setOverlayHistoryWithPersistence]);

  const manualSaveOverlay = useCallback(() => {
    setOverlayHistoryWithPersistence((previous) =>
      markPresentOverlaySaved(previous, "header-manual-save", areOverlaySessionsEqual)
    );
  }, [areOverlaySessionsEqual, setOverlayHistoryWithPersistence]);

  return useMemo(
    () => ({
      overlaySession,
      canUndoOverlay,
      canRedoOverlay,
      canManualSaveOverlay,
      activePdfIdentityKey,
      setActivePdfIdentityKey,
      loadOverlayPayload,
      clearOverlaySession,
      saveOverlayDocument,
      markOverlayEditStarted,
      undoOverlay,
      redoOverlay,
      manualSaveOverlay
    }),
    [
      canManualSaveOverlay,
      canRedoOverlay,
      canUndoOverlay,
      clearOverlaySession,
      activePdfIdentityKey,
      loadOverlayPayload,
      manualSaveOverlay,
      markOverlayEditStarted,
      overlaySession,
      redoOverlay,
      saveOverlayDocument,
      setActivePdfIdentityKey,
      undoOverlay
    ]
  );
}
