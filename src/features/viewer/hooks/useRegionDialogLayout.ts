import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type RefObject
} from "react";
import {
  REGION_DIALOG_DEFAULT_RIGHT_PANE_WIDTH,
  REGION_DIALOG_LAYOUT_STORAGE_KEY,
  REGION_DIALOG_SEPARATOR_WIDTH
} from "../constants/viewerConstants";
import {
  clampToRange,
  solveRegionDialogConstraints
} from "../utils/regionDialogConstraints";
import { useRegionDialogDrag } from "./useRegionDialogDrag";

interface RegionDialogLayoutStyle extends CSSProperties {
  "--region-dialog-right-pane-width"?: string;
  "--region-dialog-right-pane-min-width"?: string;
  "--region-dialog-left-pane-min-width"?: string;
}

interface UseRegionDialogLayoutOptions {
  minRightPaneWidth: number;
  minLeftPaneWidth: number;
  availableWidth: number;
  containerRef: RefObject<HTMLElement | null>;
}

interface UseRegionDialogLayoutResult {
  modalShellStyle: RegionDialogLayoutStyle;
  rightPaneWidth: number;
  leftPaneWidth: number;
  isDragging: boolean;
  separatorAriaMin: number;
  separatorAriaMax: number;
  onSeparatorPointerDown: ReturnType<typeof useRegionDialogDrag>["onSeparatorPointerDown"];
  onSeparatorKeyDown: ReturnType<typeof useRegionDialogDrag>["onSeparatorKeyDown"];
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

export function useRegionDialogLayout({
  minRightPaneWidth,
  minLeftPaneWidth,
  availableWidth,
  containerRef
}: UseRegionDialogLayoutOptions): UseRegionDialogLayoutResult {
  const [preferredRightPaneWidth, setPreferredRightPaneWidth] = useState(readPersistedWidth);

  const effectiveWidth = Math.max(0, Math.round(availableWidth));

  const constraints = useMemo(
    () =>
      solveRegionDialogConstraints({
        availableWidth: effectiveWidth,
        minLeftPaneWidth,
        minRightPaneWidth,
        preferredRightPaneWidth,
        separatorWidth: REGION_DIALOG_SEPARATOR_WIDTH
      }),
    [effectiveWidth, minLeftPaneWidth, minRightPaneWidth, preferredRightPaneWidth]
  );

  useEffect(() => {
    setPreferredRightPaneWidth((previous) =>
      clampToRange(previous, constraints.rightPaneMinWidth, constraints.rightPaneMaxWidth)
    );
  }, [constraints.rightPaneMaxWidth, constraints.rightPaneMinWidth]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        REGION_DIALOG_LAYOUT_STORAGE_KEY,
        String(constraints.rightPaneWidth)
      );
    } catch {
      // Ignore storage write errors.
    }
  }, [constraints.rightPaneWidth]);

  const drag = useRegionDialogDrag({
    currentWidth: constraints.rightPaneWidth,
    minWidth: constraints.rightPaneMinWidth,
    maxWidth: constraints.rightPaneMaxWidth,
    separatorWidth: constraints.separatorWidth,
    containerRef,
    onWidthChange: setPreferredRightPaneWidth
  });

  const modalShellStyle = useMemo<RegionDialogLayoutStyle>(
    () => ({
      "--region-dialog-right-pane-width": `${constraints.rightPaneWidth}px`,
      "--region-dialog-right-pane-min-width": `${constraints.minRightPaneWidth}px`,
      "--region-dialog-left-pane-min-width": `${constraints.minLeftPaneWidth}px`
    }),
    [constraints.minRightPaneWidth, constraints.minLeftPaneWidth, constraints.rightPaneWidth]
  );

  return {
    modalShellStyle,
    rightPaneWidth: constraints.rightPaneWidth,
    leftPaneWidth: constraints.leftPaneWidth,
    isDragging: drag.isDragging,
    separatorAriaMin: drag.separatorAriaMin,
    separatorAriaMax: drag.separatorAriaMax,
    onSeparatorPointerDown: drag.onSeparatorPointerDown,
    onSeparatorKeyDown: drag.onSeparatorKeyDown
  };
}
