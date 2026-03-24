import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  REGION_DIALOG_DEFAULT_RIGHT_PANE_WIDTH,
  REGION_DIALOG_LAYOUT_STORAGE_KEY,
  REGION_DIALOG_MAX_RIGHT_PANE_WIDTH,
  REGION_DIALOG_MIN_LEFT_PANE_WIDTH,
  REGION_DIALOG_MIN_RIGHT_PANE_WIDTH,
  REGION_DIALOG_RESIZE_KEYBOARD_STEP,
  REGION_DIALOG_SEPARATOR_WIDTH,
  REGION_DIALOG_STACKED_BREAKPOINT
} from "../constants/viewerConstants";

interface RegionDialogLayoutStyle extends CSSProperties {
  "--region-dialog-right-pane-width"?: string;
}

interface UseRegionDialogLayoutResult {
  modalShellStyle: RegionDialogLayoutStyle;
  rightPaneWidth: number;
  isCompactLayout: boolean;
  isDragging: boolean;
  separatorAriaMin: number;
  separatorAriaMax: number;
  onSeparatorPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSeparatorKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

function readPersistedWidth(): number {
  try {
    const raw = window.sessionStorage.getItem(REGION_DIALOG_LAYOUT_STORAGE_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage access errors and fall back to defaults.
  }
  return REGION_DIALOG_DEFAULT_RIGHT_PANE_WIDTH;
}

function clampRightPaneWidth(width: number, viewportWidth: number): number {
  const viewportBoundMax = Math.max(
    REGION_DIALOG_MIN_RIGHT_PANE_WIDTH,
    viewportWidth - REGION_DIALOG_MIN_LEFT_PANE_WIDTH - REGION_DIALOG_SEPARATOR_WIDTH
  );
  const maxWidth = Math.min(REGION_DIALOG_MAX_RIGHT_PANE_WIDTH, viewportBoundMax);
  const minWidth = Math.min(REGION_DIALOG_MIN_RIGHT_PANE_WIDTH, maxWidth);
  return Math.round(Math.min(maxWidth, Math.max(minWidth, width)));
}

export function useRegionDialogLayout(): UseRegionDialogLayoutResult {
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [rightPaneWidth, setRightPaneWidth] = useState(() =>
    clampRightPaneWidth(readPersistedWidth(), window.innerWidth)
  );

  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(0);
  const viewportWidthRef = useRef(viewportWidth);

  viewportWidthRef.current = viewportWidth;

  const isCompactLayout = viewportWidth <= REGION_DIALOG_STACKED_BREAKPOINT;
  const separatorAriaMax = clampRightPaneWidth(REGION_DIALOG_MAX_RIGHT_PANE_WIDTH, viewportWidth);
  const separatorAriaMin = Math.min(REGION_DIALOG_MIN_RIGHT_PANE_WIDTH, separatorAriaMax);

  useEffect(() => {
    const handleResize = (): void => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setRightPaneWidth((previous) => clampRightPaneWidth(previous, viewportWidth));
  }, [viewportWidth]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(REGION_DIALOG_LAYOUT_STORAGE_KEY, String(rightPaneWidth));
    } catch {
      // Ignore storage write errors.
    }
  }, [rightPaneWidth]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [isDragging]);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent): void => {
      const deltaX = event.clientX - dragStartXRef.current;
      const nextWidth = clampRightPaneWidth(dragStartWidthRef.current - deltaX, viewportWidthRef.current);
      setRightPaneWidth(nextWidth);
    };

    const handlePointerUp = (): void => {
      stopDragging();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, stopDragging]);

  const onSeparatorPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isCompactLayout) {
        return;
      }
      event.preventDefault();
      dragStartXRef.current = event.clientX;
      dragStartWidthRef.current = rightPaneWidth;
      setIsDragging(true);
    },
    [isCompactLayout, rightPaneWidth]
  );

  const onSeparatorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isCompactLayout) {
        return;
      }

      let nextWidth = rightPaneWidth;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nextWidth = rightPaneWidth + REGION_DIALOG_RESIZE_KEYBOARD_STEP;
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextWidth = rightPaneWidth - REGION_DIALOG_RESIZE_KEYBOARD_STEP;
      } else if (event.key === "Home") {
        event.preventDefault();
        nextWidth = separatorAriaMin;
      } else if (event.key === "End") {
        event.preventDefault();
        nextWidth = separatorAriaMax;
      } else {
        return;
      }

      setRightPaneWidth(clampRightPaneWidth(nextWidth, viewportWidthRef.current));
    },
    [isCompactLayout, rightPaneWidth, separatorAriaMax, separatorAriaMin]
  );

  const modalShellStyle = useMemo<RegionDialogLayoutStyle>(
    () => ({
      "--region-dialog-right-pane-width": `${rightPaneWidth}px`
    }),
    [rightPaneWidth]
  );

  return {
    modalShellStyle,
    rightPaneWidth,
    isCompactLayout,
    isDragging,
    separatorAriaMin,
    separatorAriaMax,
    onSeparatorPointerDown,
    onSeparatorKeyDown
  };
}
