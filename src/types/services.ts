import type { JsonGenerationResult } from "./json";
import type { OverlayDocument, OverlayParseResult } from "./overlay";
import type { GetFileRequest, GetFileResponse } from "./pdfRetrieval";

/**
 * Backend-facing PDF retrieval contract.
 */
export interface PdfRetrievalService {
  getFile(request: GetFileRequest, options?: { signal?: AbortSignal }): Promise<GetFileResponse>;
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
