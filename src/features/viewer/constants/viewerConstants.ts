import type { ResizeHandle } from "../utils/viewerGeometry";

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;
export const BBOX_CHANGE_EPSILON = 0.0005;
export const CREATE_DRAFT_REGION_ID = "__create-draft__";
export const REGION_DIALOG_LAYOUT_STORAGE_KEY = "viewer.regionDialogLayout.rightPaneWidth";
export const REGION_DIALOG_DEFAULT_RIGHT_PANE_WIDTH = 620;
export const REGION_DIALOG_MIN_RIGHT_PANE_WIDTH = 420;
export const REGION_DIALOG_MAX_RIGHT_PANE_WIDTH = 1600;
export const REGION_DIALOG_RESIZE_KEYBOARD_STEP = 24;
export const REGION_DIALOG_MIN_LEFT_PANE_WIDTH = 120;
export const REGION_DIALOG_SEPARATOR_WIDTH = 10;
export const REGION_DIALOG_STACKED_BREAKPOINT = 1024;

export const RESIZE_HANDLES: ResizeHandle[] = ["nw", "ne", "sw", "se"];

export const LABEL_HUES: Record<string, number> = {
  text: 196,
  "section-header": 154,
  "page-footer": 46,
  picture: 302,
  "list-item": 270,
  "page-header": 112,
  table: 18,
  formula: 338
};
