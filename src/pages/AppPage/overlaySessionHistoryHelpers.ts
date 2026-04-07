import { replacePresentHistory } from "../../utils/history";
import type { HistoryState } from "../../types/history";
import type { HistoryMeta } from "../../types/history";
import type { OverlayEditSession } from "../../types/overlay";

const RESTORE_OVERLAY_CONFIRM_MESSAGE =
  "Saved bbox edits were found for this PDF.\n\nChoose OK to restore them, or Cancel to skip and continue without restore.";

export function shouldRestorePersistedSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.confirm(RESTORE_OVERLAY_CONFIRM_MESSAGE);
}

export function markPresentOverlaySaved(
  history: HistoryState<OverlayEditSession | null>,
  action: string | undefined,
  isEqual: (left: OverlayEditSession | null, right: OverlayEditSession | null) => boolean
): HistoryState<OverlayEditSession | null> {
  const present = history.present.state;
  if (!present) {
    return history;
  }
  const nextMeta: HistoryMeta | undefined = action ? { action } : history.present.meta;

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
    nextMeta,
    isEqual
  );
}

export function resolveSwitchPresentSession(
  history: HistoryState<OverlayEditSession | null>,
  shouldPreserveCurrentSession: boolean
): OverlayEditSession | null {
  return shouldPreserveCurrentSession ? history.present.state : null;
}
