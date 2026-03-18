import type { JsonGenerationResult } from "../types/json";
import type { OverlayDocument, OverlayParseResult } from "../types/overlay";
import type { AnnotationService } from "../types/services";
import { generateWithOverlayEdits } from "./annotation/annotation.generation";
import { parseOverlayInput } from "./annotation/annotation.parsing";

/**
 * Browser annotation service orchestrating overlay parse and generation flows.
 */
export class BrowserAnnotationService implements AnnotationService {
  parseOverlayInput(rawJson: string): OverlayParseResult {
    return parseOverlayInput(rawJson);
  }

  generateWithOverlayEdits(
    sourceRoot: Record<string, unknown>,
    document: OverlayDocument
  ): JsonGenerationResult {
    return generateWithOverlayEdits(sourceRoot, document);
  }
}

export const annotationService = new BrowserAnnotationService();
