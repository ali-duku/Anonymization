import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type Dispatch,
  type SetStateAction,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import {
  ANONYMIZATION_ENTITY_LABELS,
  DEFAULT_ANONYMIZATION_ENTITY_LABEL,
  buildEntityPalette,
  coerceEntityLabel,
  hasEntityOverlap,
  normalizeEntitySpansForText,
  sortEntitySpans
} from "../../../constants/anonymizationEntities";
import { REGION_LABEL_OPTIONS } from "../../../constants/regionLabelOptions";
import type { OverlayDocument, OverlayEntitySpan, OverlayRegion } from "../../../types/overlay";
import { applyRegionEdits, removeRegionFromDocument } from "../utils/overlayDocument";
import {
  areEntitySpansEqual,
  buildTextSegments,
  getTextareaSelectionOffsets,
  remapEntitySpansAfterTextChange,
  type PendingSelectionRange
} from "../utils/textEntities";

export type TextDirection = "rtl" | "ltr";

export interface SpanEditorDraft {
  index: number;
  entity: string;
  anchorX: number;
  anchorY: number;
}

interface UseRegionEditorOptions {
  overlayDocument: OverlayDocument | null;
  currentPage: number;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}

function resetDraftFields(
  setDialogDraftLabel: Dispatch<SetStateAction<string>>,
  setDialogDraftText: Dispatch<SetStateAction<string>>,
  setDialogDraftEntities: Dispatch<SetStateAction<OverlayEntitySpan[]>>,
  setDialogTextDirection: Dispatch<SetStateAction<TextDirection>>,
  setPendingSelection: Dispatch<SetStateAction<PendingSelectionRange | null>>,
  setPendingEntity: Dispatch<SetStateAction<string>>,
  setPickerSelection: Dispatch<SetStateAction<PendingSelectionRange | null>>,
  setSpanEditor: Dispatch<SetStateAction<SpanEditorDraft | null>>,
  setEntityWarning: Dispatch<SetStateAction<string | null>>
): void {
  setDialogDraftLabel("");
  setDialogDraftText("");
  setDialogDraftEntities([]);
  setDialogTextDirection("rtl");
  setPendingSelection(null);
  setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
  setPickerSelection(null);
  setSpanEditor(null);
  setEntityWarning(null);
}

export function useRegionEditor({
  overlayDocument,
  currentPage,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: UseRegionEditorOptions) {
  const dialogTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogPreviewRef = useRef<HTMLDivElement | null>(null);

  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [dialogDraftLabel, setDialogDraftLabel] = useState("");
  const [dialogDraftText, setDialogDraftText] = useState("");
  const [dialogDraftEntities, setDialogDraftEntities] = useState<OverlayEntitySpan[]>([]);
  const [dialogTextDirection, setDialogTextDirection] = useState<TextDirection>("rtl");
  const [pendingSelection, setPendingSelection] = useState<PendingSelectionRange | null>(null);
  const [pendingEntity, setPendingEntity] = useState<string>(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
  const [pickerSelection, setPickerSelection] = useState<PendingSelectionRange | null>(null);
  const [spanEditor, setSpanEditor] = useState<SpanEditorDraft | null>(null);
  const [entityWarning, setEntityWarning] = useState<string | null>(null);

  useEffect(() => {
    setActiveRegionId(null);
    resetDraftFields(
      setDialogDraftLabel,
      setDialogDraftText,
      setDialogDraftEntities,
      setDialogTextDirection,
      setPendingSelection,
      setPendingEntity,
      setPickerSelection,
      setSpanEditor,
      setEntityWarning
    );
  }, [currentPage, overlayDocument]);

  const activeRegion = useMemo(() => {
    if (!activeRegionId || !overlayDocument) {
      return null;
    }

    for (const page of overlayDocument.pages) {
      const region = page.regions.find((item) => item.id === activeRegionId);
      if (region) {
        return region;
      }
    }

    return null;
  }, [activeRegionId, overlayDocument]);

  const normalizedDraftEntities = useMemo(
    () => normalizeEntitySpansForText(dialogDraftEntities, dialogDraftText),
    [dialogDraftEntities, dialogDraftText]
  );

  const textSegments = useMemo(
    () => buildTextSegments(dialogDraftText, normalizedDraftEntities),
    [dialogDraftText, normalizedDraftEntities]
  );

  const hasDialogChanges = useMemo(() => {
    if (!activeRegion) {
      return false;
    }

    return (
      dialogDraftLabel !== activeRegion.label ||
      dialogDraftText !== (activeRegion.text || "") ||
      !areEntitySpansEqual(
        normalizeEntitySpansForText(dialogDraftEntities, dialogDraftText),
        normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || "")
      )
    );
  }, [activeRegion, dialogDraftEntities, dialogDraftLabel, dialogDraftText]);

  const canAnonymizeSelection = useMemo(() => {
    if (!pendingSelection) {
      return false;
    }
    return !hasEntityOverlap(normalizedDraftEntities, pendingSelection.start, pendingSelection.end);
  }, [normalizedDraftEntities, pendingSelection]);

  const dialogLabelOptions = useMemo(() => {
    const known = REGION_LABEL_OPTIONS.includes(dialogDraftLabel as (typeof REGION_LABEL_OPTIONS)[number]);
    if (!dialogDraftLabel || known) {
      return REGION_LABEL_OPTIONS;
    }
    return [dialogDraftLabel, ...REGION_LABEL_OPTIONS];
  }, [dialogDraftLabel]);

  const openRegionEditor = useCallback((region: OverlayRegion) => {
    setActiveRegionId(region.id);
    setDialogDraftLabel(region.label);
    setDialogDraftText(region.text || "");
    setDialogDraftEntities(normalizeEntitySpansForText(region.entities || [], region.text || ""));
    setDialogTextDirection("rtl");
    setPendingSelection(null);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, []);

  const closeRegionEditor = useCallback(() => {
    if (hasDialogChanges) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in this region. Discard them?"
      );
      if (!shouldDiscard) {
        return;
      }
    }

    setActiveRegionId(null);
    resetDraftFields(
      setDialogDraftLabel,
      setDialogDraftText,
      setDialogDraftEntities,
      setDialogTextDirection,
      setPendingSelection,
      setPendingEntity,
      setPickerSelection,
      setSpanEditor,
      setEntityWarning
    );
  }, [hasDialogChanges]);

  const handleResetRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }

    setDialogDraftLabel(activeRegion.label);
    setDialogDraftText(activeRegion.text || "");
    setDialogDraftEntities(normalizeEntitySpansForText(activeRegion.entities || [], activeRegion.text || ""));
    setPendingSelection(null);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, [activeRegion]);

  const handleSaveRegionEditor = useCallback(() => {
    if (!activeRegion) {
      return;
    }

    const nextLabel = dialogDraftLabel.trim() || activeRegion.label;
    const nextText = dialogDraftText;
    const nextEntities = normalizeEntitySpansForText(dialogDraftEntities, nextText);

    if (overlayDocument && onOverlayDocumentSaved) {
      onOverlayEditStarted?.();
      const nextDocument = applyRegionEdits(overlayDocument, activeRegion.pageNumber, activeRegion.id, {
        label: nextLabel,
        text: nextText,
        entities: nextEntities
      });
      onOverlayDocumentSaved(nextDocument);
    }

    setActiveRegionId(null);
    resetDraftFields(
      setDialogDraftLabel,
      setDialogDraftText,
      setDialogDraftEntities,
      setDialogTextDirection,
      setPendingSelection,
      setPendingEntity,
      setPickerSelection,
      setSpanEditor,
      setEntityWarning
    );
  }, [
    activeRegion,
    dialogDraftEntities,
    dialogDraftLabel,
    dialogDraftText,
    onOverlayDocumentSaved,
    onOverlayEditStarted,
    overlayDocument
  ]);

  const handleDeleteRegionEditor = useCallback(() => {
    if (!activeRegion || !overlayDocument || !onOverlayDocumentSaved) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this bbox region? This will remove it from generated JSON output."
    );
    if (!shouldDelete) {
      return;
    }

    onOverlayEditStarted?.();
    const nextDocument = removeRegionFromDocument(
      overlayDocument,
      activeRegion.pageNumber,
      activeRegion.id
    );
    onOverlayDocumentSaved(nextDocument);

    setActiveRegionId(null);
    resetDraftFields(
      setDialogDraftLabel,
      setDialogDraftText,
      setDialogDraftEntities,
      setDialogTextDirection,
      setPendingSelection,
      setPendingEntity,
      setPickerSelection,
      setSpanEditor,
      setEntityWarning
    );
  }, [activeRegion, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument]);

  const refreshPendingSelection = useCallback(() => {
    const textarea = dialogTextareaRef.current;
    if (!textarea) {
      setPendingSelection(null);
      return;
    }

    const offsets = getTextareaSelectionOffsets(textarea, dialogDraftText);
    setPendingSelection(offsets);
  }, [dialogDraftText]);

  const handleEditorInput: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      const nextText = event.currentTarget.value.replace(/\r/g, "");
      const remapResult = remapEntitySpansAfterTextChange(
        dialogDraftText,
        nextText,
        dialogDraftEntities
      );
      setDialogDraftText(nextText);
      setDialogDraftEntities(remapResult.spans);
      setPendingSelection(null);
      setPickerSelection(null);
      setSpanEditor(null);

      if (remapResult.droppedCount > 0) {
        setEntityWarning(
          `${remapResult.droppedCount} anonymized span(s) were removed because they could not be remapped after text edits.`
        );
      } else {
        setEntityWarning(null);
      }
    },
    [dialogDraftEntities, dialogDraftText]
  );

  const handleEditorKeyUp = useCallback((_event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    refreshPendingSelection();
  }, [refreshPendingSelection]);

  const handleAnonymizeSelection = useCallback(() => {
    const textarea = dialogTextareaRef.current;
    const selectionToUse =
      pendingSelection ?? (textarea ? getTextareaSelectionOffsets(textarea, dialogDraftText) : null);

    if (!selectionToUse) {
      setEntityWarning("Select a continuous text range before anonymizing.");
      return;
    }

    if (hasEntityOverlap(normalizedDraftEntities, selectionToUse.start, selectionToUse.end)) {
      setEntityWarning("Overlapping anonymized spans are not allowed.");
      return;
    }

    setPendingSelection(selectionToUse);
    setPickerSelection(selectionToUse);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setEntityWarning(null);
  }, [dialogDraftText, normalizedDraftEntities, pendingSelection]);

  const handleApplyPickerEntity = useCallback(() => {
    if (!pickerSelection) {
      setEntityWarning("Select a continuous text range before anonymizing.");
      return;
    }

    const nextEntity = coerceEntityLabel(pendingEntity);
    if (!nextEntity) {
      setEntityWarning("Choose an entity label.");
      return;
    }

    if (hasEntityOverlap(normalizedDraftEntities, pickerSelection.start, pickerSelection.end)) {
      setEntityWarning("Overlapping anonymized spans are not allowed.");
      return;
    }

    const nextSpans = sortEntitySpans([
      ...normalizedDraftEntities,
      {
        start: pickerSelection.start,
        end: pickerSelection.end,
        entity: nextEntity
      }
    ]);

    setDialogDraftEntities(nextSpans);
    setPendingSelection(null);
    setPickerSelection(null);
    setEntityWarning(null);
  }, [normalizedDraftEntities, pendingEntity, pickerSelection]);

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
    [normalizedDraftEntities]
  );

  const handleApplySpanEditor = useCallback(() => {
    if (!spanEditor) {
      return;
    }

    if (!normalizedDraftEntities[spanEditor.index]) {
      setEntityWarning("This span no longer exists.");
      setSpanEditor(null);
      return;
    }

    const nextEntity = coerceEntityLabel(spanEditor.entity);
    if (!nextEntity) {
      setEntityWarning("Choose an entity for the highlighted range.");
      return;
    }

    const nextSpans = normalizedDraftEntities.map((span, index) =>
      index === spanEditor.index
        ? {
            start: span.start,
            end: span.end,
            entity: nextEntity
          }
        : span
    );

    setDialogDraftEntities(sortEntitySpans(nextSpans));
    setSpanEditor(null);
    setEntityWarning(null);
  }, [normalizedDraftEntities, spanEditor]);

  const handleRemoveSpan = useCallback(() => {
    if (!spanEditor) {
      return;
    }

    if (!normalizedDraftEntities[spanEditor.index]) {
      setEntityWarning("This span no longer exists.");
      setSpanEditor(null);
      return;
    }

    setDialogDraftEntities(normalizedDraftEntities.filter((_span, index) => index !== spanEditor.index));
    setSpanEditor(null);
    setEntityWarning(null);
  }, [normalizedDraftEntities, spanEditor]);

  useEffect(() => {
    if (!spanEditor) {
      return;
    }

    if (!normalizedDraftEntities[spanEditor.index]) {
      setSpanEditor(null);
    }
  }, [normalizedDraftEntities, spanEditor]);

  useEffect(() => {
    if (!activeRegionId) {
      return;
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      closeRegionEditor();
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [activeRegionId, closeRegionEditor]);

  return {
    dialogTextareaRef,
    dialogPreviewRef,
    activeRegion,
    dialogDraftLabel,
    dialogDraftText,
    dialogDraftEntities,
    dialogTextDirection,
    pendingSelection,
    pendingEntity,
    pickerSelection,
    spanEditor,
    entityWarning,
    normalizedDraftEntities,
    textSegments,
    canAnonymizeSelection,
    dialogLabelOptions,
    hasDialogChanges,
    anonymizationEntityLabels: ANONYMIZATION_ENTITY_LABELS,
    buildEntityPalette,
    openRegionEditor,
    closeRegionEditor,
    handleResetRegionEditor,
    handleSaveRegionEditor,
    handleDeleteRegionEditor,
    refreshPendingSelection,
    handleEditorInput,
    handleEditorKeyUp,
    handleAnonymizeSelection,
    handleApplyPickerEntity,
    handleOpenSpanEditor,
    handleApplySpanEditor,
    handleRemoveSpan,
    setDialogDraftLabel,
    setDialogTextDirection,
    setPendingEntity,
    setSpanEditor,
    setPickerSelection,
    setEntityWarning,
    coerceEntityLabel
  };
}
