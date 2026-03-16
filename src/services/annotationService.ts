import type { JsonErrorDetails, JsonGenerationResult } from "../types/json";
import type {
  NormalizedBbox,
  OverlayDocument,
  OverlayParseResult,
  OverlayRegion,
  OverlaySourceRef
} from "../types/overlay";
import type { AnnotationService } from "../types/services";

const BBOX_EPSILON = 1e-4;
const BBOX_ROUNDING = 6;
const PATCH_EPSILON = 1e-6;

interface ParsedContentRegion {
  bbox: NormalizedBbox;
  text: string;
  label: string;
  pageNumber: number | null;
  regionId: number | null;
  sequenceId: number | null;
  source: OverlaySourceRef;
  isUsed: boolean;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toNormalizedBbox(value: unknown): NormalizedBbox | null {
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

function buildExactBboxKey(bbox: NormalizedBbox): string {
  return `${bbox.x1}|${bbox.y1}|${bbox.x2}|${bbox.y2}`;
}

function buildRoundedBboxKey(bbox: NormalizedBbox): string {
  return [
    bbox.x1.toFixed(BBOX_ROUNDING),
    bbox.y1.toFixed(BBOX_ROUNDING),
    bbox.x2.toFixed(BBOX_ROUNDING),
    bbox.y2.toFixed(BBOX_ROUNDING)
  ].join("|");
}

function buildSourceKey(pageIndex: number, regionIndex: number): string {
  return `${pageIndex}:${regionIndex}`;
}

function buildContentSequenceMap(contentExtraction: unknown[]): Map<string, number> {
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

function isWithinTolerance(a: NormalizedBbox, b: NormalizedBbox): boolean {
  return (
    Math.abs(a.x1 - b.x1) <= BBOX_EPSILON &&
    Math.abs(a.y1 - b.y1) <= BBOX_EPSILON &&
    Math.abs(a.x2 - b.x2) <= BBOX_EPSILON &&
    Math.abs(a.y2 - b.y2) <= BBOX_EPSILON
  );
}

function toNumericOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cloneRoot(root: Record<string, unknown>): Record<string, unknown> {
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

function sanitizeBboxForPatch(bbox: NormalizedBbox): NormalizedBbox {
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

/**
 * Parses OCR JSON into a viewer-friendly overlay model.
 */
export class BrowserAnnotationService implements AnnotationService {
  parseOverlayInput(rawJson: string): OverlayParseResult {
    const trimmed = rawJson.trim();
    if (!trimmed) {
      return {
        success: false,
        document: null,
        sourceJsonRaw: rawJson,
        sourceRoot: null,
        error: { message: "Input JSON is empty." }
      };
    }

    const parsed = this.parseJson(trimmed);
    if (!parsed.success) {
      return {
        success: false,
        document: null,
        sourceJsonRaw: rawJson,
        sourceRoot: null,
        error: parsed.error
      };
    }

    try {
      return this.toOverlayDocument(parsed.value, rawJson);
    } catch (error) {
      return this.fail(error instanceof Error ? error.message : "Could not parse overlay JSON.", rawJson);
    }
  }

  generateWithOverlayEdits(sourceRoot: Record<string, unknown>, document: OverlayDocument): JsonGenerationResult {
    try {
      const rootCopy = cloneRoot(sourceRoot);
      const pipelineSteps = asObject(rootCopy.pipeline_steps);
      if (!pipelineSteps) {
        throw new Error('Missing required object at key "pipeline_steps" in loaded snapshot.');
      }

      const layoutDetection = pipelineSteps.layout_detection;
      if (!Array.isArray(layoutDetection)) {
        throw new Error('Missing required array at key "pipeline_steps.layout_detection" in loaded snapshot.');
      }

      const contentExtraction = pipelineSteps.content_extraction;
      if (!Array.isArray(contentExtraction)) {
        throw new Error('Missing required array at key "pipeline_steps.content_extraction" in loaded snapshot.');
      }

      const contentSequenceMap = buildContentSequenceMap(contentExtraction);
      let nextSequenceId = contentSequenceMap.size + 1;

      for (const page of document.pages) {
        for (const region of page.regions) {
          const nextBbox = sanitizeBboxForPatch(region.bbox);
          this.patchLayoutRegion(layoutDetection, region.layoutSource, nextBbox, region.label);

          if (region.contentSource) {
            const sequenceId =
              contentSequenceMap.get(
                buildSourceKey(region.contentSource.pageIndex, region.contentSource.regionIndex)
              ) ?? null;
            this.patchContentRegion(
              contentExtraction,
              region.contentSource,
              nextBbox,
              sequenceId,
              region.label,
              region.text
            );
          } else {
            this.appendContentRegion(
              contentExtraction,
              region.layoutSource.pageIndex,
              nextBbox,
              region.label,
              region.text,
              nextSequenceId
            );
            nextSequenceId += 1;
          }
        }
      }

      return {
        success: true,
        formattedJson: JSON.stringify(rootCopy, null, 2)
      };
    } catch (error) {
      return {
        success: false,
        formattedJson: "",
        error: {
          message: error instanceof Error ? error.message : "Could not generate JSON from overlay edits."
        }
      };
    }
  }

  private patchLayoutRegion(
    layoutDetection: unknown[],
    source: OverlaySourceRef,
    nextBbox: NormalizedBbox,
    nextLabel: string
  ): void {
    const page = asObject(layoutDetection[source.pageIndex]);
    if (!page) {
      throw new Error(`Layout page index ${source.pageIndex} is not available in loaded snapshot.`);
    }

    const regions = page.regions;
    if (!Array.isArray(regions)) {
      throw new Error(`Layout page index ${source.pageIndex} is missing a regions array in loaded snapshot.`);
    }

    const region = asObject(regions[source.regionIndex]);
    if (!region) {
      throw new Error(
        `Layout region index ${source.regionIndex} is not available on page index ${source.pageIndex}.`
      );
    }

    region.bbox = { ...nextBbox };
    region.label = nextLabel;
  }

  private patchContentRegion(
    contentExtraction: unknown[],
    source: OverlaySourceRef,
    nextBbox: NormalizedBbox,
    sequenceId: number | null,
    nextLabel: string,
    nextText: string
  ): void {
    const page = contentExtraction[source.pageIndex];
    if (!Array.isArray(page)) {
      throw new Error(`Content page index ${source.pageIndex} is not available in loaded snapshot.`);
    }

    const region = asObject(page[source.regionIndex]);
    if (!region) {
      throw new Error(
        `Content region index ${source.regionIndex} is not available on page index ${source.pageIndex}.`
      );
    }

    region.bbox = { ...nextBbox };
    region.region_label = nextLabel;
    region.text = nextText;

    const existingMetadata = asObject(region.metadata);
    const metadata = existingMetadata ?? {};
    if (!existingMetadata) {
      region.metadata = metadata;
    }

    metadata.page_number = source.pageIndex;
    const existingRegionId = toNumericOrNull(metadata.region_id);
    metadata.region_id = existingRegionId ?? sequenceId;
  }

  private appendContentRegion(
    contentExtraction: unknown[],
    pageIndex: number,
    nextBbox: NormalizedBbox,
    nextLabel: string,
    nextText: string,
    sequenceId: number
  ): void {
    while (contentExtraction.length <= pageIndex) {
      contentExtraction.push([]);
    }

    if (contentExtraction[pageIndex] === null || contentExtraction[pageIndex] === undefined) {
      contentExtraction[pageIndex] = [];
    }

    const page = contentExtraction[pageIndex];
    if (!Array.isArray(page)) {
      throw new Error(`Content page index ${pageIndex} is not available in loaded snapshot.`);
    }

    page.push({
      bbox: { ...nextBbox },
      text: nextText,
      region_label: nextLabel,
      metadata: {
        page_number: pageIndex,
        region_id: sequenceId
      }
    });
  }

  private parseJson(rawJson: string):
    | { success: true; value: unknown }
    | { success: false; error: JsonErrorDetails } {
    try {
      return { success: true, value: JSON.parse(rawJson) };
    } catch (error) {
      return {
        success: false,
        error: this.parseJsonError(rawJson, error)
      };
    }
  }

  private toOverlayDocument(rootValue: unknown, sourceJsonRaw: string): OverlayParseResult {
    const root = asObject(rootValue);
    if (!root) {
      return this.fail("JSON root must be an object.", sourceJsonRaw);
    }

    const pipelineSteps = asObject(root.pipeline_steps);
    if (!pipelineSteps) {
      return this.fail('Missing required object at key "pipeline_steps".', sourceJsonRaw);
    }

    const layoutDetection = pipelineSteps.layout_detection;
    if (!Array.isArray(layoutDetection)) {
      return this.fail('Missing required array at key "pipeline_steps.layout_detection".', sourceJsonRaw);
    }

    const contentExtraction = pipelineSteps.content_extraction;
    if (!Array.isArray(contentExtraction)) {
      return this.fail('Missing required array at key "pipeline_steps.content_extraction".', sourceJsonRaw);
    }

    const contentSequenceMap = buildContentSequenceMap(contentExtraction);

    const pages = layoutDetection.map((layoutPageValue, pageIndex) => {
      const layoutPage = asObject(layoutPageValue);
      if (!layoutPage) {
        throw new Error(`Layout page ${pageIndex + 1} must be an object.`);
      }

      const regions = layoutPage.regions;
      if (!Array.isArray(regions)) {
        throw new Error(`Layout page ${pageIndex + 1} is missing a "regions" array.`);
      }

      const contentPageValue = contentExtraction[pageIndex];
      const contentPage = this.parseContentPage(contentPageValue, pageIndex, contentSequenceMap);

      const pageNumber = pageIndex + 1;
      const overlayRegions = regions.map((layoutRegionValue, regionIndex) => {
        const layoutRegion = asObject(layoutRegionValue);
        if (!layoutRegion) {
          throw new Error(`Layout region ${regionIndex + 1} on page ${pageNumber} must be an object.`);
        }

        const bbox = toNormalizedBbox(layoutRegion.bbox);
        if (!bbox) {
          throw new Error(`Layout region ${regionIndex + 1} on page ${pageNumber} has an invalid bbox.`);
        }

        const matched = this.findContentMatch(contentPage, bbox);
        const matchedLabel = matched?.label?.trim() ? matched.label : "Unknown";
        const layoutLabel =
          typeof layoutRegion.label === "string" && layoutRegion.label.trim()
            ? layoutRegion.label
            : matchedLabel;

        const region: OverlayRegion = {
          id: `page-${pageNumber}-region-${regionIndex + 1}`,
          pageNumber,
          label: layoutLabel,
          bbox,
          matchedContent: Boolean(matched),
          text: matched?.text ?? "",
          metadata: {
            pageNumber: matched?.pageNumber ?? (matched?.source.pageIndex ?? pageIndex),
            regionId: matched?.regionId ?? matched?.sequenceId ?? null
          },
          layoutSource: {
            pageIndex,
            regionIndex
          },
          contentSource: matched?.source
        };

        return region;
      });

      return {
        pageNumber,
        regions: overlayRegions
      };
    });

    return {
      success: true,
      document: {
        pages
      },
      sourceJsonRaw,
      sourceRoot: root
    };
  }

  private parseContentPage(
    contentPageValue: unknown,
    pageIndex: number,
    contentSequenceMap: Map<string, number>
  ): ParsedContentRegion[] {
    if (contentPageValue === undefined || contentPageValue === null) {
      return [];
    }

    if (!Array.isArray(contentPageValue)) {
      throw new Error(`Content page ${pageIndex + 1} must be an array.`);
    }

    return contentPageValue.flatMap((regionValue, regionIndex) => {
      const region = asObject(regionValue);
      if (!region) {
        throw new Error(`Content region ${regionIndex + 1} on page ${pageIndex + 1} must be an object.`);
      }

      const bbox = toNormalizedBbox(region.bbox);
      if (!bbox) {
        return [];
      }

      const metadata = asObject(region.metadata);
      return {
        bbox,
        text: typeof region.text === "string" ? region.text : "",
        label: typeof region.region_label === "string" ? region.region_label : "Unknown",
        pageNumber: toNumericOrNull(metadata?.page_number),
        regionId: toNumericOrNull(metadata?.region_id),
        sequenceId: contentSequenceMap.get(buildSourceKey(pageIndex, regionIndex)) ?? null,
        source: {
          pageIndex,
          regionIndex
        },
        isUsed: false
      };
    });
  }

  private findContentMatch(contentRegions: ParsedContentRegion[], layoutBbox: NormalizedBbox): ParsedContentRegion | null {
    const exactKey = buildExactBboxKey(layoutBbox);
    const exactMatch = contentRegions.find(
      (region) => !region.isUsed && buildExactBboxKey(region.bbox) === exactKey
    );
    if (exactMatch) {
      exactMatch.isUsed = true;
      return exactMatch;
    }

    const roundedKey = buildRoundedBboxKey(layoutBbox);
    const roundedMatch = contentRegions.find(
      (region) =>
        !region.isUsed &&
        buildRoundedBboxKey(region.bbox) === roundedKey &&
        isWithinTolerance(region.bbox, layoutBbox)
    );
    if (roundedMatch) {
      roundedMatch.isUsed = true;
      return roundedMatch;
    }

    const tolerantMatch = contentRegions.find(
      (region) => !region.isUsed && isWithinTolerance(region.bbox, layoutBbox)
    );
    if (tolerantMatch) {
      tolerantMatch.isUsed = true;
      return tolerantMatch;
    }

    return null;
  }

  private parseJsonError(rawJson: string, error: unknown): JsonErrorDetails {
    const defaultMessage = "Invalid JSON.";
    if (!(error instanceof Error)) {
      return { message: defaultMessage };
    }

    const match = /position\s+(\d+)/i.exec(error.message);
    if (!match) {
      return { message: error.message || defaultMessage };
    }

    const position = Number(match[1]);
    const beforeError = rawJson.slice(0, Math.max(0, position));
    const line = beforeError.split("\n").length;
    const column = beforeError.length - beforeError.lastIndexOf("\n");

    return {
      message: error.message || defaultMessage,
      position,
      line,
      column
    };
  }

  private fail(message: string, sourceJsonRaw: string): OverlayParseResult {
    return {
      success: false,
      document: null,
      sourceJsonRaw,
      sourceRoot: null,
      error: { message }
    };
  }
}

export const annotationService = new BrowserAnnotationService();
