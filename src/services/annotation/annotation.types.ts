import type { NormalizedBbox, OverlayEntitySpan, OverlaySourceRef } from "../../types/overlay";

export interface ParsedContentRegion {
  bbox: NormalizedBbox;
  text: string;
  entities: OverlayEntitySpan[];
  label: string;
  pageNumber: number | null;
  regionId: number | null;
  sequenceId: number | null;
  source: OverlaySourceRef;
  isUsed: boolean;
}
