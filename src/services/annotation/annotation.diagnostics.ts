import type { OverlayPage } from "../../types/overlay";

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

const OVERLAY_DEBUG_ENABLED = Boolean(import.meta.env.DEV) &&
  isTruthyFlag(import.meta.env.VITE_VIEWER_BBOX_DEBUG as string | undefined);

export function logOverlayParseSummary(pages: OverlayPage[]): void {
  if (!OVERLAY_DEBUG_ENABLED) {
    return;
  }

  let regionCount = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const page of pages) {
    for (const region of page.regions) {
      regionCount += 1;
      const values = [region.bbox.x1, region.bbox.y1, region.bbox.x2, region.bbox.y2];
      for (const value of values) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }

  console.info("[overlay:parse] Parsed overlay contract summary.", {
    pages: pages.length,
    regions: regionCount,
    bboxMin: Number.isFinite(min) ? min : null,
    bboxMax: Number.isFinite(max) ? max : null
  });
}
