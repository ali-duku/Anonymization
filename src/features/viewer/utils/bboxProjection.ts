import type { NormalizedBbox } from "../../../types/overlay";
import { clamp01 } from "./viewerGeometry";

export interface PercentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function roundToPixel(value: number): number {
  return Math.max(0, Math.round(value));
}

export function canonicalizeNormalizedBbox(bbox: NormalizedBbox): NormalizedBbox {
  const x1 = clamp01(Math.min(bbox.x1, bbox.x2));
  const y1 = clamp01(Math.min(bbox.y1, bbox.y2));
  const x2 = clamp01(Math.max(bbox.x1, bbox.x2));
  const y2 = clamp01(Math.max(bbox.y1, bbox.y2));
  return { x1, y1, x2, y2 };
}

export function normalizedBboxToPercentRect(
  bbox: NormalizedBbox,
  minimumPercent = 0.01
): PercentRect {
  const normalized = canonicalizeNormalizedBbox(bbox);
  return {
    left: normalized.x1 * 100,
    top: normalized.y1 * 100,
    width: Math.max(minimumPercent, (normalized.x2 - normalized.x1) * 100),
    height: Math.max(minimumPercent, (normalized.y2 - normalized.y1) * 100)
  };
}

export function normalizedBboxToPixelRect(
  bbox: NormalizedBbox,
  surfaceWidth: number,
  surfaceHeight: number,
  minimumPixels = 1
): PixelRect | null {
  if (surfaceWidth <= 0 || surfaceHeight <= 0) {
    return null;
  }

  const normalized = canonicalizeNormalizedBbox(bbox);
  const x = roundToPixel(normalized.x1 * surfaceWidth);
  const y = roundToPixel(normalized.y1 * surfaceHeight);
  const x2 = roundToPixel(normalized.x2 * surfaceWidth);
  const y2 = roundToPixel(normalized.y2 * surfaceHeight);

  const maxX = Math.max(0, surfaceWidth - 1);
  const maxY = Math.max(0, surfaceHeight - 1);
  const safeX = Math.min(x, maxX);
  const safeY = Math.min(y, maxY);
  const maxWidth = surfaceWidth - safeX;
  const maxHeight = surfaceHeight - safeY;

  const width = Math.max(minimumPixels, x2 - x);
  const height = Math.max(minimumPixels, y2 - y);

  return {
    x: safeX,
    y: safeY,
    width: Math.min(width, maxWidth),
    height: Math.min(height, maxHeight)
  };
}
