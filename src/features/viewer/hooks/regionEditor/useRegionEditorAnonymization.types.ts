import type { ChangeEventHandler, Dispatch, MutableRefObject, SetStateAction } from "react";
import type { OverlayEntitySpan } from "../../../../types/overlay";
import type { SpanEditorDraft } from "../useRegionEditor.types";
import type { PendingSelectionRange } from "../../utils/textEntities";
import type { RegionPreviewModel } from "../../utils/previewModel";
import type { SpanBoundarySide, SpanBoundaryState } from "../../utils/spanBoundaries";

export interface UseRegionEditorAnonymizationOptions {
  dialogTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  dialogDraftText: string;
  dialogDraftEntities: OverlayEntitySpan[];
  normalizedDraftEntities: OverlayEntitySpan[];
  anonymizationEntityLabels: readonly string[];
  previewModel: RegionPreviewModel;
  pendingSelection: PendingSelectionRange | null;
  pendingEntity: string;
  pickerSelection: PendingSelectionRange | null;
  spanEditor: SpanEditorDraft | null;
  isRawTextEditingEnabled: boolean;
  commitActiveRegionEdits: (
    edits: { text?: string; entities?: OverlayEntitySpan[] },
    action?: string
  ) => boolean;
  setDialogDraftText: (nextText: string) => void;
  setDialogDraftEntities: (nextEntities: OverlayEntitySpan[]) => void;
  setPendingSelection: (nextSelection: PendingSelectionRange | null) => void;
  setPendingEntity: (nextEntity: string) => void;
  setPickerSelection: (nextSelection: PendingSelectionRange | null) => void;
  setSpanEditor: Dispatch<SetStateAction<SpanEditorDraft | null>>;
  setEntityWarning: (nextWarning: string | null) => void;
}

export interface RegionEditorAnonymizationResult {
  isSpanBoundaryDragActive: boolean;
  activeBoundaryDrag: { index: number; side: SpanBoundarySide } | null;
  getSpanBoundaryStateByIndex: (index: number) => SpanBoundaryState | null;
  refreshPendingSelection: () => void;
  handleEditorInput: ChangeEventHandler<HTMLTextAreaElement>;
  handleEditorKeyUp: () => void;
  handleAnonymizeSelection: () => void;
  handlePendingEntityChange: (nextEntity: string) => void;
  handleApplyPickerEntity: (entityOverride?: string) => void;
  handleCancelPicker: () => void;
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
