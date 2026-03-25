import { memo } from "react";
import styles from "./EntityPicker.module.css";
import type { EntityPickerProps } from "./EntityPicker.types";
import { SearchableEntityField } from "../SearchableEntityField/SearchableEntityField";

function EntityPickerComponent({
  selection,
  pendingEntity,
  entityLabels,
  coerceEntityLabel,
  containerRef,
  onPendingEntityChange,
  onCancel
}: EntityPickerProps) {
  if (!selection) {
    return null;
  }

  return (
    <div ref={containerRef} className={styles.entityPicker}>
      <span className={styles.textLabel}>
        Selected [{selection.start}, {selection.end}): "{selection.text}"
      </span>
      <label className={styles.textLabel} htmlFor="overlay-entity-select">
        Entity
      </label>
      <SearchableEntityField
        id="overlay-entity-select"
        value={pendingEntity}
        entityLabels={entityLabels}
        coerceEntityLabel={coerceEntityLabel}
        onChange={onPendingEntityChange}
        className={styles.select}
      />

      <div className={styles.actions}>
        <button type="button" className={styles.buttonPrimary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export const EntityPicker = memo(EntityPickerComponent);
