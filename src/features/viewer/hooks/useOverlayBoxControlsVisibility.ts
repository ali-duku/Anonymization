import { useCallback, useEffect, useRef, useState } from "react";

const CONTROLS_HIDE_DELAY_MS = 1000;

interface UseOverlayBoxControlsVisibilityOptions {
  isPinned: boolean;
}

interface OverlayBoxControlsVisibility {
  isControlsVisible: boolean;
  handlePointerEnter: () => void;
  handlePointerLeave: () => void;
}

export function useOverlayBoxControlsVisibility({
  isPinned
}: UseOverlayBoxControlsVisibilityOptions): OverlayBoxControlsVisibility {
  const hideTimerRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPersistVisible, setIsPersistVisible] = useState(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current === null) {
      return;
    }
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setIsPersistVisible(false);
      hideTimerRef.current = null;
    }, CONTROLS_HIDE_DELAY_MS);
  }, [clearHideTimer]);

  const handlePointerEnter = useCallback(() => {
    clearHideTimer();
    setIsHovered(true);
    setIsPersistVisible(true);
  }, [clearHideTimer]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    if (isPinned) {
      return;
    }
    scheduleHide();
  }, [isPinned, scheduleHide]);

  useEffect(() => {
    if (isPinned) {
      clearHideTimer();
      setIsPersistVisible(true);
      return;
    }

    if (!isHovered) {
      scheduleHide();
    }
  }, [clearHideTimer, isHovered, isPinned, scheduleHide]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  return {
    isControlsVisible: isPinned || isHovered || isPersistVisible,
    handlePointerEnter,
    handlePointerLeave
  };
}
