import type { NormalizedBbox, OverlayDocument } from "../../types/overlay";
import {
  BBOX_EPSILON,
  BBOX_ROUNDING,
  NORMALIZED_BBOX_TOLERANCE,
  PATCH_EPSILON
} from "./annotation.constants";

export function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function toNormalizedBbox(value: unknown): NormalizedBbox | null {
  const bbox = asObject(value);
  if (!bbox) {
    return null;
  }

  const x1 = Number(bbox.x1);
  const y1 = Number(bbox.y1);
  const x2 = Number(bbox.x2);
  const y2 = Number(bbox.y2);

  if (![x1, y1, x2, y2].every((item) => Number.isFinite(item))) {
    return null;
  }

  return { x1, y1, x2, y2 };
}

function isWithinNormalizedRange(value: number): boolean {
  return value >= -NORMALIZED_BBOX_TOLERANCE && value <= 1 + NORMALIZED_BBOX_TOLERANCE;
}

export function assertNormalizedBboxContract(bbox: NormalizedBbox, contextPath: string): void {
  const values = [bbox.x1, bbox.y1, bbox.x2, bbox.y2];
  const isValid = values.every((item) => Number.isFinite(item) && isWithinNormalizedRange(item));
  if (isValid) {
    return;
  }

  throw new Error(
    `${contextPath} bbox must use normalized coordinates in [0..1]. Received x1=${bbox.x1}, y1=${bbox.y1}, x2=${bbox.x2}, y2=${bbox.y2}.`
  );
}

export function buildExactBboxKey(bbox: NormalizedBbox): string {
  return `${bbox.x1}|${bbox.y1}|${bbox.x2}|${bbox.y2}`;
}

export function buildRoundedBboxKey(bbox: NormalizedBbox): string {
  return [
    bbox.x1.toFixed(BBOX_ROUNDING),
    bbox.y1.toFixed(BBOX_ROUNDING),
    bbox.x2.toFixed(BBOX_ROUNDING),
    bbox.y2.toFixed(BBOX_ROUNDING)
  ].join("|");
}

export function buildSourceKey(pageIndex: number, regionIndex: number): string {
  return `${pageIndex}:${regionIndex}`;
}

export function collectKeptSourceKeys(document: OverlayDocument): {
  layout: Set<string>;
  content: Set<string>;
} {
  const layout = new Set<string>();
  const content = new Set<string>();

  for (const page of document.pages) {
    for (const region of page.regions) {
      if (region.layoutSource) {
        layout.add(buildSourceKey(region.layoutSource.pageIndex, region.layoutSource.regionIndex));
      }
      if (region.contentSource) {
        content.add(buildSourceKey(region.contentSource.pageIndex, region.contentSource.regionIndex));
      }
    }
  }

  return { layout, content };
}

export function buildContentSequenceMap(contentExtraction: unknown[]): Map<string, number> {
  const sequenceMap = new Map<string, number>();
  let sequence = 1;

  for (let pageIndex = 0; pageIndex < contentExtraction.length; pageIndex += 1) {
    const page = contentExtraction[pageIndex];
    if (!Array.isArray(page)) {
      continue;
    }

    for (let regionIndex = 0; regionIndex < page.length; regionIndex += 1) {
      sequenceMap.set(buildSourceKey(pageIndex, regionIndex), sequence);
      sequence += 1;
    }
  }

  return sequenceMap;
}

export function isWithinTolerance(a: NormalizedBbox, b: NormalizedBbox): boolean {
  return (
    Math.abs(a.x1 - b.x1) <= BBOX_EPSILON &&
    Math.abs(a.y1 - b.y1) <= BBOX_EPSILON &&
    Math.abs(a.x2 - b.x2) <= BBOX_EPSILON &&
    Math.abs(a.y2 - b.y2) <= BBOX_EPSILON
  );
}

export function toNumericOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function cloneRoot(root: Record<string, unknown>): Record<string, unknown> {
  if (typeof structuredClone === "function") {
    return structuredClone(root);
  }
  return JSON.parse(JSON.stringify(root)) as Record<string, unknown>;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function roundCoord(value: number): number {
  return Number(value.toFixed(BBOX_ROUNDING));
}

export function sanitizeBboxForPatch(bbox: NormalizedBbox): NormalizedBbox {
  let x1 = clamp01(Math.min(bbox.x1, bbox.x2));
  let x2 = clamp01(Math.max(bbox.x1, bbox.x2));
  let y1 = clamp01(Math.min(bbox.y1, bbox.y2));
  let y2 = clamp01(Math.max(bbox.y1, bbox.y2));

  if (x2 - x1 < PATCH_EPSILON) {
    x2 = Math.min(1, x1 + PATCH_EPSILON);
  }
  if (y2 - y1 < PATCH_EPSILON) {
    y2 = Math.min(1, y1 + PATCH_EPSILON);
  }
  if (x2 <= x1) {
    x1 = Math.max(0, x2 - PATCH_EPSILON);
  }
  if (y2 <= y1) {
    y1 = Math.max(0, y2 - PATCH_EPSILON);
  }

  return {
    x1: roundCoord(x1),
    y1: roundCoord(y1),
    x2: roundCoord(x2),
    y2: roundCoord(y2)
  };
}

export function ensurePageArray(container: unknown[], pageIndex: number): unknown[] {
  while (container.length <= pageIndex) {
    container.push([]);
  }

  if (container[pageIndex] === null || container[pageIndex] === undefined) {
    container[pageIndex] = [];
  }

  const page = container[pageIndex];
  if (!Array.isArray(page)) {
    throw new Error(`Page index ${pageIndex} is not available in loaded snapshot.`);
  }

  return page;
}
