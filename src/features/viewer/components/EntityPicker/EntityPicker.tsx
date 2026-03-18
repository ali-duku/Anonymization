import { memo } from "react";
import styles from "./EntityPicker.module.css";
import type { EntityPickerProps } from "./EntityPicker.types";

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
      <select
        id="overlay-entity-select"
        className={styles.select}
        value={coerceEntityLabel(pendingEntity)}
        onChange={(event) => onPendingEntityChange(coerceEntityLabel(event.currentTarget.value))}
      >
        {entityLabels.map((entity) => (
          <option key={entity} value={entity}>
            {entity}
          </option>
        ))}
      </select>

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
