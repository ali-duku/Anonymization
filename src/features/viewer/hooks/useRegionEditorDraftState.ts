import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react";
import { DEFAULT_ANONYMIZATION_ENTITY_LABEL } from "../../../constants/anonymizationEntities";
import type { NormalizedBbox, OverlayEntitySpan } from "../../../types/overlay";
import type { PendingSelectionRange } from "../utils/textEntities";
import type { SpanEditorDraft, TextDirection } from "./useRegionEditor.types";

export interface RegionEditorDraftState {
  dialogTextareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  dialogPreviewRef: MutableRefObject<HTMLDivElement | null>;
  activeRegionId: string | null;
  setActiveRegionId: Dispatch<SetStateAction<string | null>>;
  dialogDraftLabel: string;
  setDialogDraftLabel: Dispatch<SetStateAction<string>>;
  dialogDraftText: string;
  setDialogDraftText: Dispatch<SetStateAction<string>>;
  dialogDraftEntities: OverlayEntitySpan[];
  setDialogDraftEntities: Dispatch<SetStateAction<OverlayEntitySpan[]>>;
  dialogDraftBbox: NormalizedBbox | null;
  setDialogDraftBbox: Dispatch<SetStateAction<NormalizedBbox | null>>;
  dialogTextDirection: TextDirection;
  setDialogTextDirection: Dispatch<SetStateAction<TextDirection>>;
  pendingSelection: PendingSelectionRange | null;
  setPendingSelection: Dispatch<SetStateAction<PendingSelectionRange | null>>;
  pendingEntity: string;
  setPendingEntity: Dispatch<SetStateAction<string>>;
  pickerSelection: PendingSelectionRange | null;
  setPickerSelection: Dispatch<SetStateAction<PendingSelectionRange | null>>;
  spanEditor: SpanEditorDraft | null;
  setSpanEditor: Dispatch<SetStateAction<SpanEditorDraft | null>>;
  entityWarning: string | null;
  setEntityWarning: Dispatch<SetStateAction<string | null>>;
  resetDraftState: () => void;
}

export function useRegionEditorDraftState(): RegionEditorDraftState {
  const dialogTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogPreviewRef = useRef<HTMLDivElement | null>(null);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [dialogDraftLabel, setDialogDraftLabel] = useState("");
  const [dialogDraftText, setDialogDraftText] = useState("");
  const [dialogDraftEntities, setDialogDraftEntities] = useState<OverlayEntitySpan[]>([]);
  const [dialogDraftBbox, setDialogDraftBbox] = useState<NormalizedBbox | null>(null);
  const [dialogTextDirection, setDialogTextDirection] = useState<TextDirection>("rtl");
  const [pendingSelection, setPendingSelection] = useState<PendingSelectionRange | null>(null);
  const [pendingEntity, setPendingEntity] = useState<string>(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
  const [pickerSelection, setPickerSelection] = useState<PendingSelectionRange | null>(null);
  const [spanEditor, setSpanEditor] = useState<SpanEditorDraft | null>(null);
  const [entityWarning, setEntityWarning] = useState<string | null>(null);

  const resetDraftState = useCallback(() => {
    setDialogDraftLabel("");
    setDialogDraftText("");
    setDialogDraftEntities([]);
    setDialogDraftBbox(null);
    setDialogTextDirection("rtl");
    setPendingSelection(null);
    setPendingEntity(DEFAULT_ANONYMIZATION_ENTITY_LABEL);
    setPickerSelection(null);
    setSpanEditor(null);
    setEntityWarning(null);
  }, []);

  return {
    dialogTextareaRef,
    dialogPreviewRef,
    activeRegionId,
    setActiveRegionId,
    dialogDraftLabel,
    setDialogDraftLabel,
    dialogDraftText,
    setDialogDraftText,
    dialogDraftEntities,
    setDialogDraftEntities,
    dialogDraftBbox,
    setDialogDraftBbox,
    dialogTextDirection,
    setDialogTextDirection,
    pendingSelection,
    setPendingSelection,
    pendingEntity,
    setPendingEntity,
    pickerSelection,
    setPickerSelection,
    spanEditor,
    setSpanEditor,
    entityWarning,
    setEntityWarning,
    resetDraftState
  };
}
