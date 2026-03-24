import type { PointerEvent as ReactPointerEvent } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import type { ResizeHandle } from "../../utils/viewerGeometry";

export interface OverlayLayerProps {
  visiblePageOverlays: OverlayRegion[];
  interactionRegionId: string | null;
  isCreateMode: boolean;
  onBeginCreateBBox: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBeginInteraction: (
    event: ReactPointerEvent<HTMLElement>,
    region: OverlayRegion,
    mode: "drag" | ResizeHandle
  ) => void;
  onOpenRegionEditor: (region: OverlayRegion) => void;
  onDeleteRegion: (region: OverlayRegion) => void;
  onCopyRegion: (region: OverlayRegion) => void;
  onCopyRegionText: (region: OverlayRegion) => void;
}
