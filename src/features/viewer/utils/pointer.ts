import type { NormalizedPoint } from "./viewerGeometry";
import { clamp01 } from "./viewerGeometry";

export function getNormalizedPointer(
  stage: HTMLDivElement | null,
  clientX: number,
  clientY: number
): NormalizedPoint | null {
  if (!stage) {
    return null;
  }

  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null;
  }

  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const normalizedX = (clientX - rect.left) / rect.width;
  const normalizedY = (clientY - rect.top) / rect.height;
  if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
    return null;
  }

  return {
    x: clamp01(normalizedX),
    y: clamp01(normalizedY)
  };
}
