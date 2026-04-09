import { memo, useMemo } from "react";
import styles from "./SpanEditorPopover.module.css";
import type { SpanEditorPopoverProps } from "./SpanEditorPopover.types";
import { SearchableEntityField } from "../SearchableEntityField/SearchableEntityField";

function SpanEditorPopoverComponent({
  spanEditor,
  spanBoundaryState,
  entityLabels,
  coerceEntityLabel,
  containerRef,
  onEntityChange,
  onAdjustBoundary,
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
      ref={containerRef}
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

      {spanBoundaryState ? (
        <section className={styles.boundarySection} aria-label="Adjust span boundaries">
          <p className={styles.boundarySummary}>
            Range: [{spanBoundaryState.start}, {spanBoundaryState.end})
          </p>
          <div className={styles.boundaryActions}>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => onAdjustBoundary(spanEditor.index, "start", -1)}
              disabled={spanBoundaryState.start <= spanBoundaryState.limits.minStart}
              title="Extend span from the left"
            >
              Extend Left
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => onAdjustBoundary(spanEditor.index, "start", 1)}
              disabled={spanBoundaryState.start >= spanBoundaryState.limits.maxStart}
              title="Shorten span from the left"
            >
              Shorten Left
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => onAdjustBoundary(spanEditor.index, "end", -1)}
              disabled={spanBoundaryState.end <= spanBoundaryState.limits.minEnd}
              title="Shorten span from the right"
            >
              Shorten Right
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => onAdjustBoundary(spanEditor.index, "end", 1)}
              disabled={spanBoundaryState.end >= spanBoundaryState.limits.maxEnd}
              title="Extend span from the right"
            >
              Extend Right
            </button>
          </div>
        </section>
      ) : null}

      <div className={styles.actions}>
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
