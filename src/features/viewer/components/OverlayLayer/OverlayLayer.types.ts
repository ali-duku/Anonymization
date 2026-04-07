import type { PointerEvent as ReactPointerEvent } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import type { ResizeHandle } from "../../utils/viewerGeometry";

export interface OverlayLayerProps {
  visiblePageOverlays: OverlayRegion[];
  pageWidth: number;
  pageHeight: number;
  interactionRegionId: string | null;
  isCreateMode: boolean;
  isBboxStructuralEditingEnabled: boolean;
  isTextCopyEnabled: boolean;
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
