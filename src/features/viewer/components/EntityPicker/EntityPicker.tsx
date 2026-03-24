import { memo } from "react";
import styles from "./EntityPicker.module.css";
import type { EntityPickerProps } from "./EntityPicker.types";
import { SearchableEntityField } from "../SearchableEntityField/SearchableEntityField";

function EntityPickerComponent({
  selection,
  pendingEntity,
  entityLabels,
  coerceEntityLabel,
  onPendingEntityChange,
  onApply,
  onCancel
}: EntityPickerProps) {
  if (!selection) {
    return null;
  }

  return (
    <div className={styles.entityPicker}>
      <span className={styles.textLabel}>
        Selected [{selection.start}, {selection.end}): "{selection.text}"
      </span>
      <label className={styles.textLabel} htmlFor="overlay-entity-select">
        Entity
      </label>
      <SearchableEntityField
        id="overlay-entity-select"
        value={coerceEntityLabel(pendingEntity)}
        entityLabels={entityLabels}
        coerceEntityLabel={coerceEntityLabel}
        onChange={onPendingEntityChange}
        className={styles.select}
      />

      <div className={styles.actions}>
        <button type="button" className={styles.buttonSecondary} onClick={onApply}>
          Apply Entity
        </button>
        <button type="button" className={styles.buttonPrimary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export const EntityPicker = memo(EntityPickerComponent);
