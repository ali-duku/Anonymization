import { memo, useMemo } from "react";
import styles from "./SpanEditorPopover.module.css";
import type { SpanEditorPopoverProps } from "./SpanEditorPopover.types";
import { SearchableEntityField } from "../SearchableEntityField/SearchableEntityField";

function SpanEditorPopoverComponent({
  spanEditor,
  entityLabels,
  coerceEntityLabel,
  onEntityChange,
  onSave,
  onRemove,
  onCancel
}: SpanEditorPopoverProps) {
  const clampedPosition = useMemo(() => {
    if (!spanEditor) {
      return null;
    }

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 720;
    const estimatedWidth = 360;
    const estimatedHeight = 170;

    const left = Math.max(8, Math.min(spanEditor.anchorX, viewportWidth - estimatedWidth - 8));
    const top = Math.max(8, Math.min(spanEditor.anchorY, viewportHeight - estimatedHeight - 8));

    return { left, top };
  }, [spanEditor]);

  if (!spanEditor || !clampedPosition) {
    return null;
  }

  return (
    <div
      className={styles.spanEditor}
      style={{
        left: `${clampedPosition.left}px`,
        top: `${clampedPosition.top}px`
      }}
    >
      <h3>Edit Anonymized Span</h3>
      <label className={styles.textLabel} htmlFor="overlay-span-entity">
        Entity
      </label>
      <SearchableEntityField
        id="overlay-span-entity"
        value={coerceEntityLabel(spanEditor.entity)}
        entityLabels={entityLabels}
        coerceEntityLabel={coerceEntityLabel}
        onChange={onEntityChange}
        className={styles.select}
      />

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
