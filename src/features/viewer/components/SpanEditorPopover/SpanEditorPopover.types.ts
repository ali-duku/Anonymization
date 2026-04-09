import type { RefObject } from "react";
import type { SpanEditorDraft } from "../../hooks/useRegionEditor.types";

export interface SpanEditorPopoverProps {
  spanEditor: SpanEditorDraft | null;
  entityLabels: readonly string[];
  coerceEntityLabel: (value: unknown) => string;
  containerRef: RefObject<HTMLDivElement>;
  onEntityChange: (nextEntity: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}
