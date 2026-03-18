import { memo } from "react";
import styles from "./SpanEditorPopover.module.css";
import type { SpanEditorPopoverProps } from "./SpanEditorPopover.types";

function SpanEditorPopoverComponent({
  spanEditor,
  entityLabels,
  coerceEntityLabel,
  onEntityChange,
  onSave,
  onRemove,
  onCancel
}: SpanEditorPopoverProps) {
  if (!spanEditor) {
    return null;
  }

  return (
    <div
      className={styles.spanEditor}
      style={{
        left: `${Math.max(8, spanEditor.anchorX)}px`,
        top: `${Math.max(8, spanEditor.anchorY)}px`
      }}
    >
      <h3>Edit Anonymized Span</h3>
      <label className={styles.textLabel} htmlFor="overlay-span-entity">
        Entity
      </label>
      <select
        id="overlay-span-entity"
        className={styles.select}
        value={coerceEntityLabel(spanEditor.entity)}
        onChange={(event) => {
          onEntityChange(coerceEntityLabel(event.currentTarget.value));
        }}
      >
        {entityLabels.map((entity) => (
          <option key={entity} value={entity}>
            {entity}
          </option>
        ))}
      </select>

      <div className={styles.actions}>
        <button type="button" className={styles.buttonSecondary} onClick={onSave}>
          Save Span
        </button>
        <button type="button" className={styles.buttonDanger} onClick={onRemove}>
          Remove Span
        </button>
        <button type="button" className={styles.buttonPrimary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export const SpanEditorPopover = memo(SpanEditorPopoverComponent);
