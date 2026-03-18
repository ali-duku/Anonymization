import type { SpanEditorDraft } from "../../hooks/useRegionEditor";

export interface SpanEditorPopoverProps {
  spanEditor: SpanEditorDraft | null;
  entityLabels: readonly string[];
  coerceEntityLabel: (value: unknown) => string;
  onEntityChange: (nextEntity: string) => void;
  onSave: () => void;
  onRemove: () => void;
  onCancel: () => void;
}
