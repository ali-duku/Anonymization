import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import type { ResizeHandle } from "../../utils/viewerGeometry";

export interface ViewerCanvasStageProps {
  hasPdf: boolean;
  pageWidth: number;
  pageHeight: number;
  visiblePageOverlays: OverlayRegion[];
  isCreateMode: boolean;
  isBboxStructuralEditingEnabled: boolean;
  isTextCopyEnabled: boolean;
  interactionRegionId: string | null;
  canvasContainerRef: RefObject<HTMLDivElement>;
  pageStageRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  onBeginCreateBBox: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBeginInteraction: (
    event: ReactPointerEvent<HTMLElement>,
    region: OverlayRegion,
    mode: "drag" | ResizeHandle
  ) => void;
  onOpenRegionEditor: (region: OverlayRegion) => void;
  onChangeRegionLabel: (region: OverlayRegion, nextLabel: string) => void;
  onDeleteRegion: (region: OverlayRegion) => void;
  onCopyRegion: (region: OverlayRegion) => void;
  onCopyRegionText: (region: OverlayRegion) => void;
}
