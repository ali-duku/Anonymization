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
import {
  markPresentOverlaySaved,
  resolveSwitchPresentSession,
  shouldRestorePersistedSession
} from "./overlaySessionHistoryHelpers";

interface UseOverlaySessionHistoryResult {
  overlaySession: OverlayEditSession | null;
  canUndoOverlay: boolean;
  canRedoOverlay: boolean;
  canManualSaveOverlay: boolean;
  currentHistoryAction: string | null;
  nextRedoHistoryAction: string | null;
  activePdfIdentityKey: string | null;
  setActivePdfIdentityKey: (nextPdfIdentityKey: string | null) => void;
  loadOverlayPayload: (payload: OverlayLoadPayload) => void;
  clearOverlaySession: () => void;
  saveOverlayDocument: (nextDocument: OverlayDocument, action?: string) => void;
  markOverlayEditStarted: () => void;
  markOverlayGenerated: () => void;
  undoOverlay: () => void;
  redoOverlay: () => void;
  manualSaveOverlay: () => void;
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
  const currentHistoryAction = overlayHistory.present.meta?.action ?? null;
  const nextRedoHistoryAction = overlayHistory.future[0]?.meta?.action ?? null;

  const setOverlayHistoryWithoutPersistence = useCallback(
    (updater: (previous: HistoryState<OverlayEditSession | null>) => HistoryState<OverlayEditSession | null>) => {
      setOverlayHistory((previous) => updater(previous));
    },
    []
  );

  const setOverlayHistoryWithPersistence = useCallback(
    (updater: (previous: HistoryState<OverlayEditSession | null>) => HistoryState<OverlayEditSession | null>) => {
      setOverlayHistory((previous) => {
        const next = updater(previous);
        const activeIdentityKey = activePdfIdentityKeyRef.current;
        const presentSession = next.present.state;
        if (activeIdentityKey && presentSession) {
          persistOverlaySession(activeIdentityKey, presentSession);
        } else if (activeIdentityKey && !presentSession) {
          removePersistedOverlaySession(activeIdentityKey);
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
      const previousPdfIdentityKey = activePdfIdentityKeyRef.current;
      if (previousPdfIdentityKey === nextPdfIdentityKey) {
        return;
      }

      activePdfIdentityKeyRef.current = nextPdfIdentityKey;
      setActivePdfIdentityKeyState(nextPdfIdentityKey);

      if (!nextPdfIdentityKey) {
        setOverlayHistoryWithoutPersistence(() =>
          createHistoryState<OverlayEditSession | null>(null, {
            meta: { action: "viewer-document-switch-reset" }
          })
        );
        return;
      }

      const restoredSession = loadPersistedOverlaySession(nextPdfIdentityKey);
      const shouldPreserveCurrentSession = previousPdfIdentityKey === null;
      if (!restoredSession) {
        setOverlayHistoryWithoutPersistence((previousHistory) => {
          const present = resolveSwitchPresentSession(previousHistory, shouldPreserveCurrentSession);
          return createHistoryState<OverlayEditSession | null>(present, {
            meta: {
              action: present ? "viewer-document-switch-preserve-current-session" : "viewer-document-switch-reset"
            }
          });
        });
        return;
      }

      if (shouldRestorePersistedSession()) {
        setOverlayHistoryWithoutPersistence(() =>
          createHistoryState<OverlayEditSession | null>(restoredSession, {
            meta: { action: "viewer-document-switch-restore" }
          })
        );
        return;
      }

      setOverlayHistoryWithoutPersistence((previousHistory) => {
        const present = resolveSwitchPresentSession(previousHistory, shouldPreserveCurrentSession);
        return createHistoryState<OverlayEditSession | null>(present, {
          meta: {
            action: present
              ? "viewer-document-switch-skip-restore-preserve-current-session"
              : "viewer-document-switch-skip-restore"
          }
        });
      });
    },
    [setOverlayHistoryWithoutPersistence]
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
    (nextDocument: OverlayDocument, action = "viewer-overlay-document-saved") => {
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
          { action },
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

  const markOverlayGenerated = useCallback(() => {
    setOverlayHistoryWithPersistence((previousHistory) => {
      const previous = previousHistory.present.state;
      if (!previous || !previous.hasViewerChanges) {
        return previousHistory;
      }

      return replacePresentHistory(
        previousHistory,
        {
          ...previous,
          hasViewerChanges: false,
          saveState: {
            ...previous.saveState,
            isSaving: false,
            isSaved: true,
            lastSavedAt: previous.saveState.lastSavedAt ?? new Date().toISOString()
          }
        },
        { action: "setup-generate-overlay-json" },
        areOverlaySessionsEqual
      );
    });
  }, [areOverlaySessionsEqual, setOverlayHistoryWithPersistence]);

  const undoOverlay = useCallback(() => {
    setOverlayHistoryWithPersistence((previous) =>
      markPresentOverlaySaved(undoHistory(previous), undefined, areOverlaySessionsEqual)
    );
  }, [areOverlaySessionsEqual, setOverlayHistoryWithPersistence]);

  const redoOverlay = useCallback(() => {
    setOverlayHistoryWithPersistence((previous) =>
      markPresentOverlaySaved(redoHistory(previous), undefined, areOverlaySessionsEqual)
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
      currentHistoryAction,
      nextRedoHistoryAction,
      activePdfIdentityKey,
      setActivePdfIdentityKey,
      loadOverlayPayload,
      clearOverlaySession,
      saveOverlayDocument,
      markOverlayEditStarted,
      markOverlayGenerated,
      undoOverlay,
      redoOverlay,
      manualSaveOverlay
    }),
    [
      canManualSaveOverlay,
      canRedoOverlay,
      canUndoOverlay,
      clearOverlaySession,
      currentHistoryAction,
      activePdfIdentityKey,
      loadOverlayPayload,
      manualSaveOverlay,
      markOverlayEditStarted,
      markOverlayGenerated,
      nextRedoHistoryAction,
      overlaySession,
      redoOverlay,
      saveOverlayDocument,
      setActivePdfIdentityKey,
      undoOverlay
    ]
  );
}
