import type { OverlayEntitySpan, OverlayRegion } from "../../../types/overlay";

export interface BboxClipboardSize {
  width: number;
  height: number;
}

export interface BboxClipboardPayload {
  label: string;
  bbox: OverlayRegion["bbox"];
  size: BboxClipboardSize;
  text: string;
  entities: OverlayEntitySpan[];
}

export interface BboxClipboardRegionEdits {
  label: string;
  bbox: OverlayRegion["bbox"];
  text: string;
  entities: OverlayEntitySpan[];
}

export function cloneEntitySpans(entities: OverlayEntitySpan[]): OverlayEntitySpan[] {
  return entities.map((entity) => ({
    start: entity.start,
    end: entity.end,
    entity: entity.entity
  }));
}

export function buildBboxClipboardPayload(region: OverlayRegion): BboxClipboardPayload {
  const bbox = {
    x1: region.bbox.x1,
    y1: region.bbox.y1,
    x2: region.bbox.x2,
    y2: region.bbox.y2
  };

  return {
    label: region.label,
    bbox,
    size: {
      width: Math.abs(bbox.x2 - bbox.x1),
      height: Math.abs(bbox.y2 - bbox.y1)
    },
    text: region.text || "",
    entities: cloneEntitySpans(region.entities || [])
  };
}

export function buildRegionEditsFromBboxClipboardPayload(
  payload: BboxClipboardPayload
): BboxClipboardRegionEdits {
  return {
    label: payload.label,
    bbox: {
      x1: payload.bbox.x1,
      y1: payload.bbox.y1,
      x2: payload.bbox.x2,
      y2: payload.bbox.y2
    },
    text: payload.text,
    entities: cloneEntitySpans(payload.entities)
  };
}
