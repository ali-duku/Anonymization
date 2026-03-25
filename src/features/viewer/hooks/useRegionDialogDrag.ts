import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from "react";
import { REGION_DIALOG_RESIZE_KEYBOARD_STEP } from "../constants/viewerConstants";
import { clampToRange } from "../utils/regionDialogConstraints";
import { measureElementInlineBounds } from "../utils/regionDialogSizing";

interface UseRegionDialogDragOptions {
  currentWidth: number;
  minWidth: number;
  maxWidth: number;
  separatorWidth: number;
  containerRef: RefObject<HTMLElement | null>;
  onWidthChange: (width: number) => void;
}

interface UseRegionDialogDragResult {
  isDragging: boolean;
  separatorAriaMin: number;
  separatorAriaMax: number;
  onSeparatorPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSeparatorKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function useRegionDialogDrag({
  currentWidth,
  minWidth,
  maxWidth,
  separatorWidth,
  containerRef,
  onWidthChange
}: UseRegionDialogDragOptions): UseRegionDialogDragResult {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(0);
  const dragPointerOffsetRef = useRef(0);
  const minWidthRef = useRef(minWidth);
  const maxWidthRef = useRef(maxWidth);
  const separatorWidthRef = useRef(separatorWidth);

  minWidthRef.current = minWidth;
  maxWidthRef.current = maxWidth;
  separatorWidthRef.current = separatorWidth;

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
      const containerElement = containerRef.current;
      const bounds = containerElement ? measureElementInlineBounds(containerElement) : null;

      let nextWidth = 0;
      if (bounds && bounds.width > 0) {
        const pointerOffsetInsideContainer = event.clientX - bounds.left;
        const nextSeparatorPosition = pointerOffsetInsideContainer - dragPointerOffsetRef.current;
        nextWidth = bounds.width - separatorWidthRef.current - nextSeparatorPosition;
      } else {
        const deltaX = event.clientX - dragStartXRef.current;
        nextWidth = dragStartWidthRef.current - deltaX;
      }

      onWidthChange(clampToRange(nextWidth, minWidthRef.current, maxWidthRef.current));
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
  }, [containerRef, isDragging, onWidthChange, stopDragging]);

  const onSeparatorPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      const containerElement = containerRef.current;
      const bounds = containerElement ? measureElementInlineBounds(containerElement) : null;

      dragStartXRef.current = event.clientX;
      dragStartWidthRef.current = currentWidth;
      if (bounds && bounds.width > 0) {
        const separatorPosition = clampToRange(
          bounds.width - separatorWidthRef.current - currentWidth,
          0,
          Math.max(0, bounds.width - separatorWidthRef.current)
        );
        const pointerOffset = event.clientX - bounds.left - separatorPosition;
        dragPointerOffsetRef.current = clampToRange(
          pointerOffset,
          0,
          separatorWidthRef.current
        );
      } else {
        dragPointerOffsetRef.current = separatorWidthRef.current / 2;
      }
      setIsDragging(true);
    },
    [containerRef, currentWidth]
  );

  const onSeparatorKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      let nextWidth = currentWidth;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nextWidth = currentWidth + REGION_DIALOG_RESIZE_KEYBOARD_STEP;
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextWidth = currentWidth - REGION_DIALOG_RESIZE_KEYBOARD_STEP;
      } else if (event.key === "Home") {
        event.preventDefault();
        nextWidth = minWidth;
      } else if (event.key === "End") {
        event.preventDefault();
        nextWidth = maxWidth;
      } else {
        return;
      }

      onWidthChange(clampToRange(nextWidth, minWidth, maxWidth));
    },
    [currentWidth, maxWidth, minWidth, onWidthChange]
  );

  return {
    isDragging,
    separatorAriaMin: Math.round(minWidth),
    separatorAriaMax: Math.round(maxWidth),
    onSeparatorPointerDown,
    onSeparatorKeyDown
  };
}
