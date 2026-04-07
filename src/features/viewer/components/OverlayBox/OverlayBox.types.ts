import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import type { ResizeHandle } from "../../utils/viewerGeometry";

export interface OverlayBoxProps {
  region: OverlayRegion;
  overlayStyle: CSSProperties;
  pageWidth: number;
  pageHeight: number;
  isEditing: boolean;
  isCreateDraftRegion: boolean;
  isCreateMode: boolean;
  isBboxStructuralEditingEnabled: boolean;
  isTextCopyEnabled: boolean;
  resizeHandles: ResizeHandle[];
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
