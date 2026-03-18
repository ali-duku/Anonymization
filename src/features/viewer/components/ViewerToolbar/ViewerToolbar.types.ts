import type { ChangeEventHandler, RefObject } from "react";

export interface ViewerToolbarProps {
  hasPdf: boolean;
  currentPage: number;
  totalPages: number;
  zoom: number;
  isCreateMode: boolean;
  canCreateBbox: boolean;
  recordSummary: string;
  overlayCount: number;
  showOverlayCount: boolean;
  saveIndicatorText: string;
  isSaving: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  onFilePick: () => void;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onMovePage: (direction: -1 | 1) => void;
  onPageInput: ChangeEventHandler<HTMLInputElement>;
  onToggleCreateMode: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitToWidth: () => void;
}
