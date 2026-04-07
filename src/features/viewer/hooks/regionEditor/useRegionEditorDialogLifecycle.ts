import { useCallback } from "react";
import { normalizeEntitySpansForText } from "../../../../constants/anonymizationEntities";
import type { OverlayRegion } from "../../../../types/overlay";
import type { TextDirection } from "../useRegionEditor.types";

interface UseRegionEditorDialogLifecycleOptions {
  activeRegion: OverlayRegion | null;
  hasDialogChanges: boolean;
  defaultAnonymizationEntityLabel: string;
  defaultTextDirection: TextDirection;
  closeAndResetEditor: () => void;
  setActiveRegionId: (nextRegionId: string | null) => void;
  setDialogDraftLabel: (nextLabel: string) => void;
  setDialogDraftBbox: (nextBbox: OverlayRegion["bbox"]) => void;
  setDialogDraftText: (nextText: string) => void;
  setDialogDraftEntities: (nextEntities: OverlayRegion["entities"]) => void;
  setDialogTextDirection: (nextDirection: TextDirection) => void;
  setPendingSelection: (nextSelection: null) => void;
  setPendingEntity: (nextEntity: string) => void;
  setPickerSelection: (nextSelection: null) => void;
  setSpanEditor: (nextSpanEditor: null) => void;
  setEntityWarning: (nextWarning: string | null) => void;
}

interface RegionEditorDialogLifecycleResult {
  openRegionEditor: (region: OverlayRegion) => void;
  closeRegionEditor: () => void;
  handleResetRegionEditor: () => void;
}

export function useRegionEditorDialogLifecycle({
  activeRegion,
  hasDialogChanges,
  defaultAnonymizationEntityLabel,
  defaultTextDirection,
  closeAndResetEditor,
  setActiveRegionId,
  setDialogDraftLabel,
  setDialogDraftBbox,
  setDialogDraftText,
  setDialogDraftEntities,
  setDialogTextDirection,
  setPendingSelection,
  setPendingEntity,
  setPickerSelection,
  setSpanEditor,
  setEntityWarning
}: UseRegionEditorDialogLifecycleOptions): RegionEditorDialogLifecycleResult {
  const openRegionEditor = useCallback((region: OverlayRegion) => {
    setActiveRegionId(region.id);
    setDialogDraftLabel(region.label);
    setDialogDraftBbox({
      x1: region.bbox.x1,
      y1: region.bbox.y1,
      x2: region.bbox.x2,
      y2: region.bbox.y2
    });
    setDialogDraftText(region.text || "");
    setDialogDraftEntities(normalizeEntitySpansForText(region.entities || [], region.text || ""));
    setDialogTextDirection(defaultTextDirection);
    setPendingSelection(null);
    setPendingEntity(defaultAnonymizationEntityLabel);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [defaultAnonymizationEntityLabel, defaultTextDirection, setActiveRegionId, setDialogDraftBbox, setDialogDraftEntities, setDialogDraftLabel, setDialogDraftText, setDialogTextDirection, setEntityWarning, setPendingEntity, setPendingSelection, setPickerSelection, setSpanEditor]);

  const closeRegionEditor = useCallback(() => {
    if (hasDialogChanges) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in this region. Discard them?"
      );
      if (!shouldDiscard) {
        return;
      }
    }
    closeAndResetEditor();
  }, [closeAndResetEditor, hasDialogChanges]);

  const handleResetRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }
    setDialogDraftLabel(activeRegion.label);
    setDialogDraftBbox({
      x1: activeRegion.bbox.x1,
      y1: activeRegion.bbox.y1,
      x2: activeRegion.bbox.x2,
      y2: activeRegion.bbox.y2
    });
    setDialogDraftText(activeRegion.text || "");
    setDialogDraftEntities(normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || ""));
    setPendingSelection(null);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [activeRegion, setDialogDraftBbox, setDialogDraftEntities, setDialogDraftLabel, setDialogDraftText, setEntityWarning, setPendingSelection, setPickerSelection, setSpanEditor]);

  return {
    openRegionEditor,
    closeRegionEditor,
    handleResetRegionEditor
  };
}
