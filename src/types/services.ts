import type { JsonGenerationResult } from "./json";
import type { OverlayDocument, OverlayParseResult } from "./overlay";
import type { PersistedViewerState, StoredPdfRecord } from "./pdf";

/**
 * Storage contract used by the viewer tab.
 */
export interface StorageService {
  loadPdfRecord(): Promise<StoredPdfRecord | null>;
  savePdfRecord(record: StoredPdfRecord): Promise<void>;
  replacePdf(file: File, initialState: PersistedViewerState): Promise<StoredPdfRecord>;
  loadViewerState(): Promise<PersistedViewerState | null>;
  saveViewerState(state: PersistedViewerState): Promise<void>;
  clearPdfRecord(): Promise<void>;
}

/**
 * JSON workflow contract used by the setup tab.
 */
export interface JsonService {
  generate(rawJson: string): JsonGenerationResult;
  copyToClipboard(text: string): Promise<boolean>;
}

/**
 * Overlay parser contract used by Setup -> Viewer loading.
 */
export interface AnnotationService {
  parseOverlayInput(rawJson: string): OverlayParseResult;
  generateWithOverlayEdits(sourceRoot: Record<string, unknown>, document: OverlayDocument): JsonGenerationResult;
}
