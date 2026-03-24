interface StageGeometrySnapshot {
  page: number;
  zoom: number;
  stageWidth: number;
  stageHeight: number;
  canvasCssWidth: number;
  canvasCssHeight: number;
  canvasPixelWidth: number;
  canvasPixelHeight: number;
}

function isTruthyFlag(value: string | boolean | undefined): boolean {
  if (value === true) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export const VIEWER_BBOX_DEBUG_ENABLED = Boolean(import.meta.env.DEV) &&
  isTruthyFlag(import.meta.env.VITE_VIEWER_BBOX_DEBUG as string | undefined);

export function logStageGeometryMismatch(snapshot: StageGeometrySnapshot): void {
  if (!VIEWER_BBOX_DEBUG_ENABLED) {
    return;
  }

  const widthDelta = Math.abs(snapshot.stageWidth - snapshot.canvasCssWidth);
  const heightDelta = Math.abs(snapshot.stageHeight - snapshot.canvasCssHeight);
  if (widthDelta <= 1 && heightDelta <= 1) {
    return;
  }

  console.warn("[viewer:bbox] Stage/canvas basis mismatch detected.", snapshot);
}
