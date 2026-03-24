import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import type { ResizeHandle } from "../../utils/viewerGeometry";

export interface OverlayBoxProps {
  region: OverlayRegion;
  overlayStyle: CSSProperties;
  isEditing: boolean;
  isCreateDraftRegion: boolean;
  isCreateMode: boolean;
  resizeHandles: ResizeHandle[];
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
