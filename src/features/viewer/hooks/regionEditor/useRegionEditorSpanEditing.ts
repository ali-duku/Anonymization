import { useCallback, useEffect, useState } from "react";
import { coerceEntityLabel, sortEntitySpans } from "../../../../constants/anonymizationEntities";
import type { OverlayEntitySpan } from "../../../../types/overlay";
import { canApplySelectionToTablePreview } from "../../utils/previewModel";
import { areEntitySpansEqual } from "../../utils/textEntities";
import {
  buildBoundaryAdjustedSpans,
  getSpanBoundaryState,
  type SpanBoundarySide
} from "../../utils/spanBoundaries";
import type {
  RegionEditorSpanEditingResult,
  SpanBoundaryDragState,
  UseRegionEditorSpanEditingOptions
} from "./useRegionEditorSpanEditing.types";

export function useRegionEditorSpanEditing({
  normalizedDraftEntities,
  anonymizationEntityLabels,
  spanEditor,
  dialogDraftText,
  previewModel,
  commitActiveRegionEdits,
  setDialogDraftEntities,
  setPendingSelection,
  setPickerSelection,
  setSpanEditor,
  setEntityWarning
}: UseRegionEditorSpanEditingOptions): RegionEditorSpanEditingResult {
  const [boundaryDrag, setBoundaryDrag] = useState<SpanBoundaryDragState | null>(null);
  const textLength = dialogDraftText.length;

  useEffect(() => {
    if (boundaryDrag && !normalizedDraftEntities[boundaryDrag.index]) {
      setBoundaryDrag(null);
    }
  }, [boundaryDrag, normalizedDraftEntities]);

  const getSpanBoundaryStateByIndex = useCallback(
    (index: number) => getSpanBoundaryState(normalizedDraftEntities, index, textLength),
    [normalizedDraftEntities, textLength]
  );

  const applyBoundary = useCallback(
    (index: number, side: SpanBoundarySide, nextBoundaryValue: number): OverlayEntitySpan[] | null => {
      const nextSpans = buildBoundaryAdjustedSpans(
        normalizedDraftEntities,
        index,
        side,
        nextBoundaryValue,
        textLength
      );
      if (!nextSpans) {
        setEntityWarning("This span no longer exists.");
        return null;
      }

      const nextSpan = nextSpans[index];
      if (!nextSpan) {
        setEntityWarning("This span no longer exists.");
        return null;
      }

      const selectionValidation = canApplySelectionToTablePreview(
        previewModel,
        nextSpan.start,
        nextSpan.end
      );
      if (!selectionValidation.valid) {
        setEntityWarning(selectionValidation.warning.message);
        return null;
      }

      setDialogDraftEntities(nextSpans);
      setEntityWarning(null);
      return nextSpans;
    },
    [normalizedDraftEntities, previewModel, setDialogDraftEntities, setEntityWarning, textLength]
  );

  const commitBoundaryResize = useCallback(
    (nextEntities: OverlayEntitySpan[]) => {
      commitActiveRegionEdits({ text: dialogDraftText, entities: nextEntities }, "viewer-region-entity-resize");
    },
    [commitActiveRegionEdits, dialogDraftText]
  );

  const handleStartBoundaryDrag = useCallback(
    (index: number, side: SpanBoundarySide) => {
      if (!normalizedDraftEntities[index]) {
        setEntityWarning("This span no longer exists.");
        return;
      }
      setBoundaryDrag({
        index,
        side,
        initialEntities: normalizedDraftEntities.map((span) => ({ ...span }))
      });
      setPendingSelection(null);
      setPickerSelection(null);
      setEntityWarning(null);
    },
    [normalizedDraftEntities, setEntityWarning, setPendingSelection, setPickerSelection]
  );

  const handleUpdateBoundaryDrag = useCallback(
    (nextBoundaryValue: number) => {
      if (!boundaryDrag) {
        return;
      }
      applyBoundary(boundaryDrag.index, boundaryDrag.side, nextBoundaryValue);
    },
    [applyBoundary, boundaryDrag]
  );

  const handleEndBoundaryDragCommit = useCallback(() => {
    if (!boundaryDrag) {
      return;
    }
    const didChange = !areEntitySpansEqual(normalizedDraftEntities, boundaryDrag.initialEntities);
    if (didChange) {
      commitBoundaryResize(normalizedDraftEntities);
    }
    setBoundaryDrag(null);
  }, [boundaryDrag, commitBoundaryResize, normalizedDraftEntities]);

  const handleCancelBoundaryDrag = useCallback(() => {
    if (!boundaryDrag) {
      return;
    }
    setDialogDraftEntities(boundaryDrag.initialEntities);
    setBoundaryDrag(null);
    setEntityWarning(null);
  }, [boundaryDrag, setDialogDraftEntities, setEntityWarning]);

  const handleAdjustBoundaryStep = useCallback(
    (index: number, side: SpanBoundarySide, delta: number) => {
      const span = normalizedDraftEntities[index];
      if (!span) {
        setEntityWarning("This span no longer exists.");
        return;
      }
      const nextBoundaryValue = side === "start" ? span.start + delta : span.end + delta;
      const nextSpans = applyBoundary(index, side, nextBoundaryValue);
      if (!nextSpans || areEntitySpansEqual(nextSpans, normalizedDraftEntities)) {
        return;
      }
      commitBoundaryResize(nextSpans);
    },
    [applyBoundary, commitBoundaryResize, normalizedDraftEntities, setEntityWarning]
  );

  const handleOpenSpanEditor = useCallback(
    (index: number, anchorX: number, anchorY: number) => {
      const span = normalizedDraftEntities[index];
      if (!span) {
        return;
      }

      setSpanEditor({
        index,
        entity: coerceEntityLabel(span.entity),
        anchorX,
        anchorY
      });
      setPendingSelection(null);
      setPickerSelection(null);
    },
    [normalizedDraftEntities, setPendingSelection, setPickerSelection, setSpanEditor]
  );

  const handleApplySpanEditor = useCallback(
    (entityOverride?: string) => {
      if (!spanEditor) {
        return;
      }

      if (!normalizedDraftEntities[spanEditor.index]) {
        setEntityWarning("This span no longer exists.");
        setSpanEditor(null);
        return;
      }

      const nextEntityInput = (entityOverride ?? spanEditor.entity).trim();
      if (!anonymizationEntityLabels.includes(nextEntityInput)) {
        setEntityWarning("Choose an entity for the highlighted range.");
        return;
      }

      const nextEntity = coerceEntityLabel(nextEntityInput);
      const nextSpans = normalizedDraftEntities.map((span, index) =>
        index === spanEditor.index
          ? { start: span.start, end: span.end, entity: nextEntity }
          : span
      );
      const sortedNextSpans = sortEntitySpans(nextSpans);

      setDialogDraftEntities(sortedNextSpans);
      setSpanEditor(null);
      setEntityWarning(null);
      commitActiveRegionEdits(
        {
          text: dialogDraftText,
          entities: sortedNextSpans
        },
        "viewer-region-entity-update"
      );
    },
    [
      anonymizationEntityLabels,
      commitActiveRegionEdits,
      dialogDraftText,
      normalizedDraftEntities,
      setDialogDraftEntities,
      setEntityWarning,
      setSpanEditor,
      spanEditor
    ]
  );

  const handleSpanEditorEntityChange = useCallback(
    (nextEntity: string) => {
      setSpanEditor((previous) => (previous ? { ...previous, entity: nextEntity } : previous));
      if (!spanEditor) {
        return;
      }
      handleApplySpanEditor(nextEntity);
    },
    [handleApplySpanEditor, setSpanEditor, spanEditor]
  );

  const handleCancelSpanEditor = useCallback(() => {
    setSpanEditor(null);
    setEntityWarning(null);
  }, [setEntityWarning, setSpanEditor]);

  const handleRemoveSpan = useCallback(() => {
    if (!spanEditor) {
      return;
    }

    if (!normalizedDraftEntities[spanEditor.index]) {
      setEntityWarning("This span no longer exists.");
      setSpanEditor(null);
      return;
    }

    const nextEntities = normalizedDraftEntities.filter((_span, index) => index !== spanEditor.index);
    setDialogDraftEntities(nextEntities);
    setSpanEditor(null);
    setEntityWarning(null);
    commitActiveRegionEdits(
      {
        text: dialogDraftText,
        entities: nextEntities
      },
      "viewer-region-entity-remove"
    );
  }, [
    commitActiveRegionEdits,
    dialogDraftText,
    normalizedDraftEntities,
    setDialogDraftEntities,
    setEntityWarning,
    setSpanEditor,
    spanEditor
  ]);

  return {
    isSpanBoundaryDragActive: Boolean(boundaryDrag),
    activeBoundaryDrag: boundaryDrag ? { index: boundaryDrag.index, side: boundaryDrag.side } : null,
    getSpanBoundaryStateByIndex,
    handleOpenSpanEditor,
    handleSpanEditorEntityChange,
    handleApplySpanEditor,
    handleCancelSpanEditor,
    handleRemoveSpan,
    handleStartBoundaryDrag,
    handleUpdateBoundaryDrag,
    handleEndBoundaryDragCommit,
    handleCancelBoundaryDrag,
    handleAdjustBoundaryStep
  };
}
