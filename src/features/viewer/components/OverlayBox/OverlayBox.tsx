import { memo, useMemo } from "react";
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
  resizeHandles,
  onBeginInteraction,
  onOpenRegionEditor
}: OverlayBoxProps) {
  const palette = useMemo(() => buildPalette(region.label), [region.label]);

  return (
    <div
      className={`${styles.overlayBox} ${isEditing ? styles.overlayBoxEditing : ""}`}
      style={overlayStyle}
    >
      <div
        className={styles.overlayDragSurface}
        onPointerDown={(event) => onBeginInteraction(event, region, "drag")}
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
              aria-label={`Resize ${region.label} region (${handle.toUpperCase()})`}
            />
          ))}
          <button
            type="button"
            className={styles.overlayEditButton}
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
          >
            Edit
          </button>
        </>
      )}
    </div>
  );
}

export const OverlayBox = memo(OverlayBoxComponent);
