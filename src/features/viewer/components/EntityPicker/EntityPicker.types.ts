import type { PendingSelectionRange } from "../../utils/textEntities";

export interface EntityPickerProps {
  selection: PendingSelectionRange | null;
  pendingEntity: string;
  entityLabels: readonly string[];
  coerceEntityLabel: (value: unknown) => string;
  onPendingEntityChange: (nextEntity: string) => void;
  onApply: () => void;
  onCancel: () => void;
}
