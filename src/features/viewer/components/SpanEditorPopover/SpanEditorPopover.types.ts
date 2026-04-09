import type { RefObject } from "react";
import type { SpanEditorDraft } from "../../hooks/useRegionEditor.types";
import type { SpanBoundarySide, SpanBoundaryState } from "../../utils/spanBoundaries";

export interface SpanEditorPopoverProps {
  spanEditor: SpanEditorDraft | null;
  spanBoundaryState: SpanBoundaryState | null;
  entityLabels: readonly string[];
  coerceEntityLabel: (value: unknown) => string;
  containerRef: RefObject<HTMLDivElement>;
  onEntityChange: (nextEntity: string) => void;
  onAdjustBoundary: (index: number, side: SpanBoundarySide, delta: number) => void;
  onRemove: () => void;
  onCancel: () => void;
}
