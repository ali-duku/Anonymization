import { useCallback, type Dispatch, type SetStateAction } from "react";
import { coerceEntityLabel, sortEntitySpans } from "../../../../constants/anonymizationEntities";
import type { OverlayEntitySpan } from "../../../../types/overlay";
import type { SpanEditorDraft } from "../useRegionEditor.types";

interface UseRegionEditorSpanEditingOptions {
  normalizedDraftEntities: OverlayEntitySpan[];
  anonymizationEntityLabels: readonly string[];
  spanEditor: SpanEditorDraft | null;
  dialogDraftText: string;
  commitActiveRegionEdits: (edits: { text?: string; entities?: OverlayEntitySpan[] }) => boolean;
  setDialogDraftEntities: (nextEntities: OverlayEntitySpan[]) => void;
  setPendingSelection: (nextSelection: null) => void;
  setPickerSelection: (nextSelection: null) => void;
  setSpanEditor: Dispatch<SetStateAction<SpanEditorDraft | null>>;
  setEntityWarning: (nextWarning: string | null) => void;
}

interface RegionEditorSpanEditingResult {
  handleOpenSpanEditor: (index: number, anchorX: number, anchorY: number) => void;
  handleSpanEditorEntityChange: (nextEntity: string) => void;
  handleApplySpanEditor: (entityOverride?: string) => void;
  handleCancelSpanEditor: () => void;
  handleRemoveSpan: () => void;
}

export function useRegionEditorSpanEditing({
  normalizedDraftEntities,
  anonymizationEntityLabels,
  spanEditor,
  dialogDraftText,
  commitActiveRegionEdits,
  setDialogDraftEntities,
  setPendingSelection,
  setPickerSelection,
  setSpanEditor,
  setEntityWarning
}: UseRegionEditorSpanEditingOptions): RegionEditorSpanEditingResult {
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
          ? {
              start: span.start,
              end: span.end,
              entity: nextEntity
            }
          : span
      );
      const sortedNextSpans = sortEntitySpans(nextSpans);

      setDialogDraftEntities(sortedNextSpans);
      setSpanEditor(null);
      setEntityWarning(null);
      commitActiveRegionEdits({
        text: dialogDraftText,
        entities: sortedNextSpans
      });
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
      setSpanEditor((previous) =>
        previous
          ? {
              ...previous,
              entity: nextEntity
            }
          : previous
      );
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
    commitActiveRegionEdits({
      text: dialogDraftText,
      entities: nextEntities
    });
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
    handleOpenSpanEditor,
    handleSpanEditorEntityChange,
    handleApplySpanEditor,
    handleCancelSpanEditor,
    handleRemoveSpan
  };
}
