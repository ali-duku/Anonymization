import { memo, useMemo } from "react";
import { buildRegionLabelOptions } from "../../../../constants/regionLabelOptions";
import { buildPalette } from "../../utils/viewerPalette";
import styles from "./OverlayBox.module.css";
import type { OverlayBoxProps } from "./OverlayBox.types";

const HANDLE_CLASS_MAP = {
  nw: styles.overlayResizeHandleNw,
  ne: styles.overlayResizeHandleNe,
  sw: styles.overlayResizeHandleSw,
  se: styles.overlayResizeHandleSe
};

function OverlayBoxComponent({
  region,
  overlayStyle,
  isEditing,
  isCreateDraftRegion,
  isCreateMode,
  isBboxStructuralEditingEnabled,
  isTextCopyEnabled,
  resizeHandles,
  onBeginInteraction,
  onOpenRegionEditor,
  onChangeRegionLabel,
  onDeleteRegion,
  onCopyRegion,
  onCopyRegionText
}: OverlayBoxProps) {
  const palette = useMemo(() => buildPalette(region.label), [region.label]);
  const labelOptions = useMemo(() => buildRegionLabelOptions(region.label), [region.label]);

  return (
    <div
      className={`${styles.overlayBox} ${isEditing ? styles.overlayBoxEditing : ""}`}
      style={overlayStyle}
    >
      <div
        className={styles.overlayDragSurface}
        onPointerDown={(event) => {
          if (!isBboxStructuralEditingEnabled) {
            return;
          }
          onBeginInteraction(event, region, "drag");
        }}
        onDoubleClick={() => {
          if (isCreateMode || isCreateDraftRegion) {
            return;
          }
          onOpenRegionEditor(region);
        }}
        aria-hidden="true"
      />

      {!isCreateDraftRegion && (
        <>
          {resizeHandles.map((handle) => (
            <button
              key={handle}
              type="button"
              className={`${styles.overlayResizeHandle} ${HANDLE_CLASS_MAP[handle]}`}
              onPointerDown={(event) => onBeginInteraction(event, region, handle)}
              onClick={(event) => event.preventDefault()}
              disabled={!isBboxStructuralEditingEnabled}
              aria-label={`Resize ${region.label} region (${handle.toUpperCase()})`}
            />
          ))}
          <div className={styles.overlayActionGroup}>
            <select
              className={styles.overlayLabelSelect}
              style={{
                borderColor: palette.border,
                background: palette.buttonBackground,
                color: palette.buttonText
              }}
              value={region.label}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onChangeRegionLabel(region, event.currentTarget.value)}
              disabled={isCreateMode}
              aria-label={`Change ${region.label} region label`}
              title="Change label"
            >
              {labelOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.overlayActionButton}
              style={{
                borderColor: palette.border,
                background: palette.buttonBackground,
                color: palette.buttonText
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                if (isCreateMode) {
                  return;
                }
                onCopyRegion(region);
              }}
              disabled={!isBboxStructuralEditingEnabled}
              aria-label={`Copy ${region.label} region`}
              title="Copy bbox"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.overlayActionIcon}>
                <path
                  d="M9 4h10a1 1 0 0 1 1 1v12h-2V6H9V4zm-4 4h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              type="button"
              className={styles.overlayActionButton}
              style={{
                borderColor: palette.border,
                background: palette.buttonBackground,
                color: palette.buttonText
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                if (isCreateMode) {
                  return;
                }
                onCopyRegionText(region);
              }}
              disabled={!isTextCopyEnabled}
              aria-label={`Copy text from ${region.label} region`}
              title={!isTextCopyEnabled ? "Text copy is disabled." : "Copy text"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.overlayActionIcon}>
                <path
                  d="M5 5h14v2H5V5zm4 4h6v2H9V9zm-4 4h14v2H5v-2zm6 4h2v2h-2v-2z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              type="button"
              className={styles.overlayActionButton}
              style={{
                borderColor: palette.border,
                background: palette.buttonBackground,
                color: palette.buttonText
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                if (isCreateMode) {
                  return;
                }
                onOpenRegionEditor(region);
              }}
              aria-label={`Edit ${region.label} region`}
              title="Edit"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.overlayActionIcon}>
                <path
                  d="M4 20l4-.8L19.2 8l-3.2-3.2L4.8 16 4 20zm13.1-14.1l1-1a1.5 1.5 0 0 1 2.1 0l1 1a1.5 1.5 0 0 1 0 2.1l-1 1-3.1-3.1z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.overlayActionButton} ${styles.overlayDeleteButton}`}
              style={{
                borderColor: palette.border
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                if (isCreateMode) {
                  return;
                }
                onDeleteRegion(region);
              }}
              disabled={!isBboxStructuralEditingEnabled}
              aria-label={`Delete ${region.label} region`}
              title="Delete"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.overlayActionIcon}>
                <path
                  d="M9 3h6l1 2h4v2H4V5h4l1-2zm-2 6h10l-1 11H8L7 9zm3 2v7h2v-7h-2zm4 0v7h2v-7h-2z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export const OverlayBox = memo(OverlayBoxComponent);
