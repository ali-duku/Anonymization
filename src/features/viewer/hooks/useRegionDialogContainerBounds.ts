import { useLayoutEffect, useState, type RefObject } from "react";
import { measureElementInlineBounds } from "../utils/regionDialogSizing";

interface UseRegionDialogContainerBoundsOptions {
  containerRef: RefObject<HTMLElement | null>;
  isEnabled?: boolean;
}

interface UseRegionDialogContainerBoundsResult {
  availableWidth: number;
}

function readInitialWidth(): number {
  if (typeof window === "undefined" || !Number.isFinite(window.innerWidth)) {
    return 0;
  }
  return Math.max(0, Math.round(window.innerWidth));
}

export function useRegionDialogContainerBounds({
  containerRef,
  isEnabled = true
}: UseRegionDialogContainerBoundsOptions): UseRegionDialogContainerBoundsResult {
  const [availableWidth, setAvailableWidth] = useState<number>(readInitialWidth);

  useLayoutEffect(() => {
    if (!isEnabled) {
      return;
    }

    const containerElement = containerRef.current;
    if (!containerElement) {
      return;
    }

    let frameId: number | null = null;

    const measureNow = (): void => {
      const { width } = measureElementInlineBounds(containerElement);
      setAvailableWidth((previous) => (previous === width ? previous : width));
    };

    const scheduleMeasure = (): void => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        measureNow();
      });
    };

    measureNow();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(containerElement);

    window.addEventListener("resize", scheduleMeasure);
    window.visualViewport?.addEventListener("resize", scheduleMeasure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.visualViewport?.removeEventListener("resize", scheduleMeasure);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };
  }, [containerRef, isEnabled]);

  return { availableWidth };
}
