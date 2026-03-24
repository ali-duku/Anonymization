import type { NormalizedBbox } from "../../../types/overlay";
import { normalizedBboxToPixelRect } from "./bboxProjection";

export interface CanvasCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function normalizedBboxToCanvasCrop(
  bbox: NormalizedBbox,
  canvasWidth: number,
  canvasHeight: number
): CanvasCropRect | null {
  return normalizedBboxToPixelRect(bbox, canvasWidth, canvasHeight, 1);
}
