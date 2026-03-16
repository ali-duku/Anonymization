import type { JsonErrorDetails } from "./json";

export interface NormalizedBbox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface OverlayMetadata {
  pageNumber: number | null;
  regionId: number | null;
}

export interface OverlaySourceRef {
  pageIndex: number;
  regionIndex: number;
}

export interface OverlayRegion {
  id: string;
  pageNumber: number;
  label: string;
  bbox: NormalizedBbox;
  matchedContent: boolean;
  text: string;
  metadata: OverlayMetadata;
  layoutSource: OverlaySourceRef;
  contentSource?: OverlaySourceRef;
}

export interface OverlayPage {
  pageNumber: number;
  regions: OverlayRegion[];
}

export interface OverlayDocument {
  pages: OverlayPage[];
}

export interface OverlaySaveState {
  isSaving: boolean;
  isSaved: boolean;
  lastSavedAt: string | null;
}

export interface OverlayLoadPayload {
  document: OverlayDocument;
  sourceJsonRaw: string;
  sourceRoot: Record<string, unknown>;
}

export interface OverlayEditSession extends OverlayLoadPayload {
  saveState: OverlaySaveState;
}

export interface OverlayParseResult {
  success: boolean;
  document: OverlayDocument | null;
  sourceJsonRaw: string;
  sourceRoot: Record<string, unknown> | null;
  error?: JsonErrorDetails;
}
