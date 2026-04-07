import { memo } from "react";
import { CREATE_DRAFT_REGION_ID, RESIZE_HANDLES } from "../../constants/viewerConstants";
import { toOverlayStyle } from "../../utils/viewerPalette";
import { OverlayBox } from "../OverlayBox/OverlayBox";
import styles from "./OverlayLayer.module.css";
import type { OverlayLayerProps } from "./OverlayLayer.types";

function OverlayLayerComponent({
  visiblePageOverlays,
  pageWidth,
  pageHeight,
  interactionRegionId,
  isCreateMode,
  isBboxStructuralEditingEnabled,
  isTextCopyEnabled,
  onBeginCreateBBox,
  onBeginInteraction,
  onOpenRegionEditor,
  onChangeRegionLabel,
  onDeleteRegion,
  onCopyRegion,
  onCopyRegionText
}: OverlayLayerProps) {
  return (
    <div className={styles.overlayLayer} aria-label="Page overlays">
      {isCreateMode && isBboxStructuralEditingEnabled && (
        <div
          className={styles.overlayCreateSurface}
          onPointerDown={onBeginCreateBBox}
          aria-label="Create bbox surface"
          role="button"
        />
      )}

      {visiblePageOverlays.map((region) => {
        const isCreateDraftRegion = region.id === CREATE_DRAFT_REGION_ID;
        const isEditing = interactionRegionId === region.id;

        return (
          <OverlayBox
            key={region.id}
            region={region}
            overlayStyle={toOverlayStyle(region, region.bbox)}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            isEditing={isEditing}
            isCreateDraftRegion={isCreateDraftRegion}
            isCreateMode={isCreateMode}
            isBboxStructuralEditingEnabled={isBboxStructuralEditingEnabled}
            isTextCopyEnabled={isTextCopyEnabled}
            resizeHandles={[...RESIZE_HANDLES]}
            onBeginInteraction={onBeginInteraction}
            onOpenRegionEditor={onOpenRegionEditor}
            onChangeRegionLabel={onChangeRegionLabel}
            onDeleteRegion={onDeleteRegion}
            onCopyRegion={onCopyRegion}
            onCopyRegionText={onCopyRegionText}
          />
        );
      })}
    </div>
  );
}

export const OverlayLayer = memo(OverlayLayerComponent);
