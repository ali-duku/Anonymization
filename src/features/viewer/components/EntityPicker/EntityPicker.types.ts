import type { RefObject } from "react";
import type { PendingSelectionRange } from "../../utils/textEntities";

export interface EntityPickerProps {
  selection: PendingSelectionRange | null;
  pendingEntity: string;
  entityLabels: readonly string[];
  coerceEntityLabel: (value: unknown) => string;
  containerRef: RefObject<HTMLDivElement>;
  onPendingEntityChange: (nextEntity: string) => void;
  onCancel: () => void;
}
