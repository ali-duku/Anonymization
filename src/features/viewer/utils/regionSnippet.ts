import type { NormalizedBbox } from "../../../types/overlay";
import { clamp01 } from "./viewerGeometry";

export interface CanvasCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function roundRect(value: number): number {
  return Math.max(0, Math.round(value));
}

export function clampNormalizedBbox(bbox: NormalizedBbox): NormalizedBbox {
  const x1 = clamp01(Math.min(bbox.x1, bbox.x2));
  const y1 = clamp01(Math.min(bbox.y1, bbox.y2));
  const x2 = clamp01(Math.max(bbox.x1, bbox.x2));
  const y2 = clamp01(Math.max(bbox.y1, bbox.y2));
  return { x1, y1, x2, y2 };
}

export function normalizedBboxToCanvasCrop(
  bbox: NormalizedBbox,
  canvasWidth: number,
  canvasHeight: number
): CanvasCropRect | null {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return null;
  }

  const clamped = clampNormalizedBbox(bbox);
  const x = roundRect(clamped.x1 * canvasWidth);
  const y = roundRect(clamped.y1 * canvasHeight);
  const x2 = roundRect(clamped.x2 * canvasWidth);
  const y2 = roundRect(clamped.y2 * canvasHeight);

  const width = Math.max(1, x2 - x);
  const height = Math.max(1, y2 - y);

  return {
    x: Math.min(x, canvasWidth - 1),
    y: Math.min(y, canvasHeight - 1),
    width: Math.min(width, canvasWidth),
    height: Math.min(height, canvasHeight)
  };
}
