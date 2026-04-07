import { useEffect } from "react";
import type { OverlayEditSession } from "../../types/overlay";

function hasUnsavedLatestEdits(session: OverlayEditSession): boolean {
  return session.saveState.isSaving || !session.saveState.isSaved;
}

function hasUngeneratedWork(session: OverlayEditSession): boolean {
  return session.hasViewerChanges;
}

export function useOverlayBeforeUnloadPrompt(overlaySession: OverlayEditSession | null): void {
  const shouldWarn = overlaySession
    ? hasUnsavedLatestEdits(overlaySession) || hasUngeneratedWork(overlaySession)
    : false;

  useEffect(() => {
    if (!shouldWarn) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarn]);
}
