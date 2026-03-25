import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  measurePaneHorizontalChrome,
  measureProtectedContainerRequiredWidth
} from "../utils/regionDialogSizing";

interface UseRegionDialogPaneMinimumsOptions {
  leftPaneRef: RefObject<HTMLElement | null>;
  leftProtectedRef: RefObject<HTMLElement | null>;
  rightPaneRef: RefObject<HTMLElement | null>;
  rightProtectedRef: RefObject<HTMLElement | null>;
  isEnabled?: boolean;
}

interface UseRegionDialogPaneMinimumsResult {
  minLeftPaneWidth: number;
  minRightPaneWidth: number;
}

interface PaneMinimumState extends UseRegionDialogPaneMinimumsResult {
  leftProtectedMinWidth: number;
  rightProtectedMinWidth: number;
}

export function useRegionDialogPaneMinimums({
  leftPaneRef,
  leftProtectedRef,
  rightPaneRef,
  rightProtectedRef,
  isEnabled = true
}: UseRegionDialogPaneMinimumsOptions): UseRegionDialogPaneMinimumsResult {
  const frameRef = useRef<number | null>(null);
  const [minimums, setMinimums] = useState<PaneMinimumState>({
    minLeftPaneWidth: 0,
    minRightPaneWidth: 0,
    leftProtectedMinWidth: 0,
    rightProtectedMinWidth: 0
  });

  useLayoutEffect(() => {
    if (!isEnabled) {
      return;
    }

    const leftPaneElement = leftPaneRef.current;
    const leftProtectedElement = leftProtectedRef.current;
    const rightPaneElement = rightPaneRef.current;
    const rightProtectedElement = rightProtectedRef.current;

    if (!leftPaneElement || !leftProtectedElement || !rightPaneElement || !rightProtectedElement) {
      return;
    }

    const measureNow = (): void => {
      const measuredLeftProtected = safeWidth(
        measureProtectedContainerRequiredWidth(leftProtectedElement)
      );
      const measuredRightProtected = safeWidth(
        measureProtectedContainerRequiredWidth(rightProtectedElement)
      );
      const leftPaneChrome = safeWidth(measurePaneHorizontalChrome(leftPaneElement));
      const rightPaneChrome = safeWidth(measurePaneHorizontalChrome(rightPaneElement));

      setMinimums((previous) => {
        const nextLeftProtected =
          measuredLeftProtected > 0 ? measuredLeftProtected : previous.leftProtectedMinWidth;
        const nextRightProtected =
          measuredRightProtected > 0 ? measuredRightProtected : previous.rightProtectedMinWidth;

        const measuredLeftPane =
          nextLeftProtected > 0 ? safeWidth(nextLeftProtected + leftPaneChrome) : 0;
        const measuredRightPane =
          nextRightProtected > 0 ? safeWidth(nextRightProtected + rightPaneChrome) : 0;

        const nextLeftMin = measuredLeftPane > 0 ? measuredLeftPane : previous.minLeftPaneWidth;
        const nextRightMin =
          measuredRightPane > 0 ? measuredRightPane : previous.minRightPaneWidth;

        const nextState: PaneMinimumState = {
          minLeftPaneWidth: nextLeftMin,
          minRightPaneWidth: nextRightMin,
          leftProtectedMinWidth: nextLeftProtected,
          rightProtectedMinWidth: nextRightProtected
        };

        if (
          previous.minLeftPaneWidth === nextState.minLeftPaneWidth &&
          previous.minRightPaneWidth === nextState.minRightPaneWidth &&
          previous.leftProtectedMinWidth === nextState.leftProtectedMinWidth &&
          previous.rightProtectedMinWidth === nextState.rightProtectedMinWidth
        ) {
          return previous;
        }

        return nextState;
      });
    };

    const scheduleMeasure = (): void => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null;
          measureNow();
        });
      });
    };

    measureNow();
    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(leftPaneElement);
    resizeObserver.observe(leftProtectedElement);
    resizeObserver.observe(rightPaneElement);
    resizeObserver.observe(rightProtectedElement);

    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(leftProtectedElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });
    mutationObserver.observe(rightProtectedElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });

    const handleWindowResize = (): void => {
      scheduleMeasure();
    };
    window.addEventListener("resize", handleWindowResize);

    const fonts = document.fonts;
    const handleFontsReady = (): void => {
      scheduleMeasure();
    };
    fonts?.addEventListener?.("loadingdone", handleFontsReady);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      fonts?.removeEventListener?.("loadingdone", handleFontsReady);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [
    leftPaneRef,
    leftProtectedRef,
    rightPaneRef,
    rightProtectedRef,
    isEnabled
  ]);

  return minimums;
}

function safeWidth(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.ceil(value);
}
