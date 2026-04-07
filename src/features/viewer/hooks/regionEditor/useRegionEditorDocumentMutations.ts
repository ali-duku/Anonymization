import { useCallback, useMemo } from "react";
import { normalizeEntitySpansForText } from "../../../../constants/anonymizationEntities";
import type { OverlayDocument, OverlayRegion } from "../../../../types/overlay";
import { buildRegionEditsFromBboxClipboardPayload } from "../../utils/bboxClipboard";
import { applyRegionEdits, removeRegionFromDocument } from "../../utils/overlayDocument";
import type { BboxClipboardPayload } from "../../utils/bboxClipboard";

interface UseRegionEditorDocumentMutationsOptions {
  overlayDocument: OverlayDocument | null;
  activeRegion: OverlayRegion | null;
  activeRegionId: string | null;
  copiedBbox: BboxClipboardPayload | null;
  isBboxStructuralEditingEnabled: boolean;
  isRawTextEditingEnabled: boolean;
  dialogDraftLabel: string;
  dialogDraftText: string;
  dialogDraftEntities: OverlayRegion["entities"];
  dialogDraftBbox: OverlayRegion["bbox"] | null;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument, action?: string) => void;
  setDialogDraftLabel: (nextLabel: string) => void;
  setDialogDraftText: (nextText: string) => void;
  setDialogDraftEntities: (nextEntities: OverlayRegion["entities"]) => void;
  setDialogDraftBbox: (nextBbox: OverlayRegion["bbox"]) => void;
  setPendingSelection: (next: null) => void;
  setPickerSelection: (next: null) => void;
  setSpanEditor: (next: null) => void;
  setEntityWarning: (next: string | null) => void;
  closeAndResetEditor: () => void;
}

interface RegionEditorDocumentMutationsResult {
  canPasteCopiedBboxIntoRegion: boolean;
  commitActiveRegionEdits: (edits: {
    bbox?: OverlayRegion["bbox"];
    label?: string;
    text?: string;
    entities?: OverlayRegion["entities"];
  }, action?: string) => boolean;
  handleSaveRegionEditor: () => boolean;
  updateRegionLabelWithCanonicalFlow: (region: OverlayRegion, nextLabelRaw: string) => void;
  handleDialogDraftLabelChange: (nextLabel: string) => void;
  handlePasteCopiedBboxIntoRegion: () => void;
  deleteRegionWithCanonicalFlow: (region: OverlayRegion) => void;
  handleDeleteRegionEditor: () => void;
}

export function useRegionEditorDocumentMutations({
  overlayDocument,
  activeRegion,
  activeRegionId,
  copiedBbox,
  isBboxStructuralEditingEnabled,
  isRawTextEditingEnabled,
  dialogDraftLabel,
  dialogDraftText,
  dialogDraftEntities,
  dialogDraftBbox,
  onOverlayEditStarted,
  onOverlayDocumentSaved,
  setDialogDraftLabel,
  setDialogDraftText,
  setDialogDraftEntities,
  setDialogDraftBbox,
  setPendingSelection,
  setPickerSelection,
  setSpanEditor,
  setEntityWarning,
  closeAndResetEditor
}: UseRegionEditorDocumentMutationsOptions): RegionEditorDocumentMutationsResult {
  const commitActiveRegionEdits = useCallback(
    (edits: {
      bbox?: OverlayRegion["bbox"];
      label?: string;
      text?: string;
      entities?: OverlayRegion["entities"];
    }, action = "viewer-region-document-mutation") => {
      if (!activeRegion || !overlayDocument || !onOverlayDocumentSaved) {
        return false;
      }

      const nextDocument = applyRegionEdits(overlayDocument, activeRegion.pageNumber, activeRegion.id, edits);
      if (nextDocument === overlayDocument) {
        return false;
      }

      onOverlayEditStarted?.();
      onOverlayDocumentSaved(nextDocument, action);
      return true;
    },
    [activeRegion, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument]
  );

  const handleSaveRegionEditor = useCallback((): boolean => {
    if (!activeRegion) {
      return false;
    }

    const nextLabel = isBboxStructuralEditingEnabled
      ? dialogDraftLabel.trim() || activeRegion.label
      : activeRegion.label;
    const nextBbox = isBboxStructuralEditingEnabled
      ? dialogDraftBbox ?? activeRegion.bbox
      : activeRegion.bbox;
    const nextText = isRawTextEditingEnabled ? dialogDraftText : activeRegion.text || "";
    const nextEntities = normalizeEntitySpansForText(dialogDraftEntities, nextText);

    return commitActiveRegionEdits(
      {
        bbox: nextBbox,
        label: nextLabel,
        text: nextText,
        entities: nextEntities
      },
      "viewer-region-editor-save"
    );
  }, [
    activeRegion,
    commitActiveRegionEdits,
    dialogDraftBbox,
    dialogDraftEntities,
    dialogDraftLabel,
    dialogDraftText,
    isBboxStructuralEditingEnabled,
    isRawTextEditingEnabled
  ]);

  const updateRegionLabelWithCanonicalFlow = useCallback(
    (region: OverlayRegion, nextLabelRaw: string) => {
      if (!isBboxStructuralEditingEnabled || !overlayDocument || !onOverlayDocumentSaved) {
        return;
      }

      const nextLabel = nextLabelRaw.trim() || region.label;
      if (nextLabel === region.label) {
        if (activeRegionId === region.id) {
          setDialogDraftLabel(nextLabel);
        }
        return;
      }

      const nextDocument = applyRegionEdits(overlayDocument, region.pageNumber, region.id, {
        label: nextLabel
      });
      if (nextDocument === overlayDocument) {
        return;
      }

      onOverlayEditStarted?.();
      onOverlayDocumentSaved(nextDocument, "viewer-region-label-update");

      if (activeRegionId === region.id) {
        setDialogDraftLabel(nextLabel);
      }
    },
    [
      activeRegionId,
      isBboxStructuralEditingEnabled,
      onOverlayDocumentSaved,
      onOverlayEditStarted,
      overlayDocument,
      setDialogDraftLabel
    ]
  );

  const handleDialogDraftLabelChange = useCallback(
    (nextLabel: string) => {
      if (!isBboxStructuralEditingEnabled) {
        return;
      }
      setDialogDraftLabel(nextLabel);
    },
    [isBboxStructuralEditingEnabled, setDialogDraftLabel]
  );

  const canPasteCopiedBboxIntoRegion = useMemo(
    () => Boolean(activeRegion && copiedBbox && isBboxStructuralEditingEnabled),
    [activeRegion, copiedBbox, isBboxStructuralEditingEnabled]
  );

  const handlePasteCopiedBboxIntoRegion = useCallback(() => {
    if (!isBboxStructuralEditingEnabled || !activeRegion || !copiedBbox) {
      return;
    }

    const edits = buildRegionEditsFromBboxClipboardPayload(copiedBbox);
    setDialogDraftLabel(edits.label);
    setDialogDraftBbox(edits.bbox);
    setDialogDraftText(edits.text);
    setDialogDraftEntities(normalizeEntitySpansForText(edits.entities, edits.text));
    setPendingSelection(null);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [
    activeRegion,
    copiedBbox,
    isBboxStructuralEditingEnabled,
    setDialogDraftBbox,
    setDialogDraftEntities,
    setDialogDraftLabel,
    setDialogDraftText,
    setEntityWarning,
    setPendingSelection,
    setPickerSelection,
    setSpanEditor
  ]);

  const deleteRegionWithCanonicalFlow = useCallback(
    (region: OverlayRegion) => {
      if (!isBboxStructuralEditingEnabled || !overlayDocument || !onOverlayDocumentSaved) {
        return;
      }

      const shouldDelete = window.confirm(
        "Delete this bbox region? This will remove it from generated JSON output."
      );
      if (!shouldDelete) {
        return;
      }

      onOverlayEditStarted?.();
      const nextDocument = removeRegionFromDocument(overlayDocument, region.pageNumber, region.id);
      onOverlayDocumentSaved(nextDocument, "viewer-region-delete");

      if (activeRegionId === region.id) {
        closeAndResetEditor();
      }
    },
    [
      activeRegionId,
      closeAndResetEditor,
      isBboxStructuralEditingEnabled,
      onOverlayDocumentSaved,
      onOverlayEditStarted,
      overlayDocument
    ]
  );

  const handleDeleteRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }
    deleteRegionWithCanonicalFlow(activeRegion);
  }, [activeRegion, deleteRegionWithCanonicalFlow]);

  return {
    canPasteCopiedBboxIntoRegion,
    commitActiveRegionEdits,
    handleSaveRegionEditor,
    updateRegionLabelWithCanonicalFlow,
    handleDialogDraftLabelChange,
    handlePasteCopiedBboxIntoRegion,
    deleteRegionWithCanonicalFlow,
    handleDeleteRegionEditor
  };
}
