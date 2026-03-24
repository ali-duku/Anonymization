import { memo } from "react";
import { OverlayLayer } from "../OverlayLayer/OverlayLayer";
import styles from "./ViewerCanvasStage.module.css";
import type { ViewerCanvasStageProps } from "./ViewerCanvasStage.types";

function ViewerCanvasStageComponent({
  hasPdf,
  pageWidth,
  pageHeight,
  visiblePageOverlays,
  isCreateMode,
  interactionRegionId,
  canvasContainerRef,
  pageStageRef,
  canvasRef,
  onBeginCreateBBox,
  onBeginInteraction,
  onOpenRegionEditor,
  onDeleteRegion,
  onCopyRegion,
  onCopyRegionText
}: ViewerCanvasStageProps) {
  return (
    <div
      ref={canvasContainerRef}
      className={`${styles.canvasShell} ${hasPdf ? styles.canvasShellActive : ""}`}
      onContextMenu={(event) => {
        if (hasPdf) {
          event.preventDefault();
        }
      }}
    >
      <div
        ref={pageStageRef}
        className={styles.pageStage}
        style={
          pageWidth > 0 && pageHeight > 0
            ? {
                width: `${pageWidth}px`,
                height: `${pageHeight}px`
              }
            : undefined
        }
      >
        {hasPdf && <canvas ref={canvasRef} className={styles.pdfCanvas} />}

        {hasPdf && (visiblePageOverlays.length > 0 || isCreateMode) && (
          <OverlayLayer
            visiblePageOverlays={visiblePageOverlays}
            interactionRegionId={interactionRegionId}
            isCreateMode={isCreateMode}
            onBeginCreateBBox={onBeginCreateBBox}
            onBeginInteraction={onBeginInteraction}
            onOpenRegionEditor={onOpenRegionEditor}
            onDeleteRegion={onDeleteRegion}
            onCopyRegion={onCopyRegion}
            onCopyRegionText={onCopyRegionText}
          />
        )}
      </div>
    </div>
  );
}

export const ViewerCanvasStage = memo(ViewerCanvasStageComponent);
