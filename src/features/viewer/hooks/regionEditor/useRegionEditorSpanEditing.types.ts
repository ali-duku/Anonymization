import type { Dispatch, SetStateAction } from "react";
import type { OverlayEntitySpan } from "../../../../types/overlay";
import type { SpanEditorDraft } from "../useRegionEditor.types";
import type { RegionPreviewModel } from "../../utils/previewModel";
import type { SpanBoundarySide, SpanBoundaryState } from "../../utils/spanBoundaries";

export interface SpanBoundaryDragState {
  index: number;
  side: SpanBoundarySide;
  initialEntities: OverlayEntitySpan[];
}

export interface UseRegionEditorSpanEditingOptions {
  normalizedDraftEntities: OverlayEntitySpan[];
  anonymizationEntityLabels: readonly string[];
  spanEditor: SpanEditorDraft | null;
  dialogDraftText: string;
  previewModel: RegionPreviewModel;
  commitActiveRegionEdits: (
    edits: { text?: string; entities?: OverlayEntitySpan[] },
    action?: string
  ) => boolean;
  setDialogDraftEntities: (nextEntities: OverlayEntitySpan[]) => void;
  setPendingSelection: (nextSelection: null) => void;
  setPickerSelection: (nextSelection: null) => void;
  setSpanEditor: Dispatch<SetStateAction<SpanEditorDraft | null>>;
  setEntityWarning: (nextWarning: string | null) => void;
}

export interface RegionEditorSpanEditingResult {
  isSpanBoundaryDragActive: boolean;
  activeBoundaryDrag: { index: number; side: SpanBoundarySide } | null;
  getSpanBoundaryStateByIndex: (index: number) => SpanBoundaryState | null;
  handleOpenSpanEditor: (index: number, anchorX: number, anchorY: number) => void;
  handleSpanEditorEntityChange: (nextEntity: string) => void;
  handleApplySpanEditor: (entityOverride?: string) => void;
  handleCancelSpanEditor: () => void;
  handleRemoveSpan: () => void;
  handleStartBoundaryDrag: (index: number, side: SpanBoundarySide) => void;
  handleUpdateBoundaryDrag: (nextBoundaryValue: number) => void;
  handleEndBoundaryDragCommit: () => void;
  handleCancelBoundaryDrag: () => void;
  handleAdjustBoundaryStep: (index: number, side: SpanBoundarySide, delta: number) => void;
}
