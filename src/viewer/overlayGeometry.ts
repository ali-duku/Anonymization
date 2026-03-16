import type { NormalizedBbox } from "../types/overlay";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface NormalizedMinimumSize {
  width: number;
  height: number;
}

const EPSILON = 1e-6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeNormalizedMinimumSize(
  pageWidth: number,
  pageHeight: number,
  minPixels = 10
): NormalizedMinimumSize {
  const safeWidth = pageWidth > 0 ? pageWidth : 1;
  const safeHeight = pageHeight > 0 ? pageHeight : 1;
  return {
    width: Math.max(EPSILON, minPixels / safeWidth),
    height: Math.max(EPSILON, minPixels / safeHeight)
  };
}

export function moveBboxWithinPage(
  bbox: NormalizedBbox,
  delta: NormalizedPoint
): NormalizedBbox {
  const width = bbox.x2 - bbox.x1;
  const height = bbox.y2 - bbox.y1;
  const nextX1 = clamp(bbox.x1 + delta.x, 0, 1 - width);
  const nextY1 = clamp(bbox.y1 + delta.y, 0, 1 - height);
  return {
    x1: nextX1,
    y1: nextY1,
    x2: nextX1 + width,
    y2: nextY1 + height
  };
}

export function resizeBboxWithinPage(
  bbox: NormalizedBbox,
  delta: NormalizedPoint,
  handle: ResizeHandle,
  minimumSize: NormalizedMinimumSize
): NormalizedBbox {
  const minW = Math.max(minimumSize.width, EPSILON);
  const minH = Math.max(minimumSize.height, EPSILON);

  let x1 = bbox.x1;
  let y1 = bbox.y1;
  let x2 = bbox.x2;
  let y2 = bbox.y2;

  if (handle === "nw") {
    x1 = clamp(bbox.x1 + delta.x, 0, bbox.x2 - minW);
    y1 = clamp(bbox.y1 + delta.y, 0, bbox.y2 - minH);
  } else if (handle === "ne") {
    x2 = clamp(bbox.x2 + delta.x, bbox.x1 + minW, 1);
    y1 = clamp(bbox.y1 + delta.y, 0, bbox.y2 - minH);
  } else if (handle === "sw") {
    x1 = clamp(bbox.x1 + delta.x, 0, bbox.x2 - minW);
    y2 = clamp(bbox.y2 + delta.y, bbox.y1 + minH, 1);
  } else if (handle === "se") {
    x2 = clamp(bbox.x2 + delta.x, bbox.x1 + minW, 1);
    y2 = clamp(bbox.y2 + delta.y, bbox.y1 + minH, 1);
  }

  return {
    x1,
    y1,
    x2,
    y2
  };
}
