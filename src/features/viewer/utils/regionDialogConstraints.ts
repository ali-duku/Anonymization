export interface RegionDialogConstraintInput {
  availableWidth: number;
  minLeftPaneWidth: number;
  minRightPaneWidth: number;
  preferredRightPaneWidth: number;
  separatorWidth: number;
}

export interface RegionDialogConstraintResult {
  availableWidth: number;
  separatorWidth: number;
  minLeftPaneWidth: number;
  minRightPaneWidth: number;
  requiredSplitWidth: number;
  separatorMinPosition: number;
  separatorMaxPosition: number;
  separatorPosition: number;
  rightPaneMinWidth: number;
  rightPaneMaxWidth: number;
  rightPaneWidth: number;
  leftPaneWidth: number;
}

export function solveRegionDialogConstraints({
  availableWidth,
  minLeftPaneWidth,
  minRightPaneWidth,
  preferredRightPaneWidth,
  separatorWidth
}: RegionDialogConstraintInput): RegionDialogConstraintResult {
  const normalizedAvailableWidth = normalizeWidth(availableWidth);
  const normalizedSeparatorWidth = normalizeWidth(separatorWidth);
  const maxPaneWidth = Math.max(0, normalizedAvailableWidth - normalizedSeparatorWidth);
  const normalizedMinLeftPaneWidth = clampToRange(minLeftPaneWidth, 0, maxPaneWidth);
  const normalizedMinRightPaneWidth = clampToRange(minRightPaneWidth, 0, maxPaneWidth);

  const requiredSplitWidth =
    normalizedMinLeftPaneWidth + normalizedMinRightPaneWidth + normalizedSeparatorWidth;
  let separatorMinPosition = clampToRange(normalizedMinLeftPaneWidth, 0, maxPaneWidth);
  let separatorMaxPosition = clampToRange(
    normalizedAvailableWidth - normalizedSeparatorWidth - normalizedMinRightPaneWidth,
    0,
    maxPaneWidth
  );

  if (separatorMaxPosition < separatorMinPosition) {
    separatorMinPosition = separatorMaxPosition;
  }

  const preferredSeparatorPosition = clampToRange(
    normalizedAvailableWidth - normalizedSeparatorWidth - preferredRightPaneWidth,
    0,
    maxPaneWidth
  );
  const separatorPosition = clampToRange(
    preferredSeparatorPosition,
    separatorMinPosition,
    separatorMaxPosition
  );
  const leftPaneWidth = separatorPosition;
  const rightPaneWidth = Math.max(0, normalizedAvailableWidth - normalizedSeparatorWidth - separatorPosition);
  const rightPaneMinWidth = Math.max(
    0,
    normalizedAvailableWidth - normalizedSeparatorWidth - separatorMaxPosition
  );
  const rightPaneMaxWidth = Math.max(
    rightPaneMinWidth,
    normalizedAvailableWidth - normalizedSeparatorWidth - separatorMinPosition
  );

  return {
    availableWidth: normalizedAvailableWidth,
    separatorWidth: normalizedSeparatorWidth,
    minLeftPaneWidth: separatorMinPosition,
    minRightPaneWidth: rightPaneMinWidth,
    requiredSplitWidth,
    separatorMinPosition,
    separatorMaxPosition,
    separatorPosition,
    rightPaneMinWidth,
    rightPaneMaxWidth,
    rightPaneWidth,
    leftPaneWidth
  };
}

export function clampToRange(value: number, min: number, max: number): number {
  const safeMin = normalizeWidth(min);
  const safeMax = Math.max(safeMin, normalizeWidth(max));
  const safeValue = Number.isFinite(value) ? value : safeMin;
  return Math.round(Math.min(safeMax, Math.max(safeMin, safeValue)));
}

function normalizeWidth(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.round(value);
}
