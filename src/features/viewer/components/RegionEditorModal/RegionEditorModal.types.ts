import type { ChangeEventHandler, KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import type { OverlayEntitySpan, OverlayRegion } from "../../../../types/overlay";
import type { SpanEditorDraft, TextDirection } from "../../hooks/useRegionEditor.types";
import type { PendingSelectionRange, TextSegment } from "../../utils/textEntities";

export interface RegionEditorSnippet {
  imageUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface RegionEditorModalProps {
  activeRegion: OverlayRegion | null;
  snippet: RegionEditorSnippet | null;
  dialogDraftLabel: string;
  dialogDraftText: string;
  dialogTextDirection: TextDirection;
  dialogLabelOptions: readonly string[];
  pendingSelection: PendingSelectionRange | null;
  pendingEntity: string;
  pickerSelection: PendingSelectionRange | null;
  spanEditor: SpanEditorDraft | null;
  entityWarning: string | null;
  textSegments: TextSegment[];
  normalizedDraftEntities: OverlayEntitySpan[];
  anonymizationEntityLabels: readonly string[];
  canAnonymizeSelection: boolean;
  hasPreviousRegion: boolean;
  hasNextRegion: boolean;
  currentRegionOrder: number | null;
  totalRegionsOnPage: number;
  dialogTextareaRef: RefObject<HTMLTextAreaElement>;
  dialogPreviewRef: RefObject<HTMLDivElement>;
  buildEntityPalette: (entity: string) => { background: string; text: string; border: string };
  coerceEntityLabel: (value: unknown) => string;
  onClose: () => void;
  onLabelChange: (nextLabel: string) => void;
  onToggleDirection: () => void;
  onAnonymize: () => void;
  onGoPreviousRegion: () => void;
  onGoNextRegion: () => void;
  onPendingEntityChange: (nextEntity: string) => void;
  onCancelPicker: () => void;
  onEditorInput: ChangeEventHandler<HTMLTextAreaElement>;
  onEditorSelect: () => void;
  onEditorMouseUp: () => void;
  onEditorKeyUp: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onOpenSpanEditor: (index: number, anchorX: number, anchorY: number) => void;
  onSpanEditorEntityChange: (nextEntity: string) => void;
  onRemoveSpan: () => void;
  onCancelSpanEditor: () => void;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
  onCopyRegion: (region: OverlayRegion) => void;
  isRawTextEditingEnabled: boolean;
  isTextCopyEnabled: boolean;
  isBboxStructuralEditingEnabled: boolean;
  hasCopiedBbox: boolean;
  onPasteRegionFromClipboard: () => void;
  onCopyRegionText: (region: OverlayRegion) => void;
}
