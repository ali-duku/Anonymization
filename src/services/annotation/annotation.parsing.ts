import type { JsonErrorDetails } from "../../types/json";
import type { OverlayParseResult, OverlayRegion } from "../../types/overlay";
import { logOverlayParseSummary } from "./annotation.diagnostics";
import { parseJsonError } from "./jsonError";
import { findContentMatch, parseContentPage } from "./annotation.matching";
import {
  asObject,
  assertNormalizedBboxContract,
  buildContentSequenceMap,
  toNormalizedBbox
} from "./annotation.helpers";

function fail(message: string, sourceJsonRaw: string): OverlayParseResult {
  return {
    success: false,
    document: null,
    sourceJsonRaw,
    sourceRoot: null,
    error: { message }
  };
}

function parseJson(rawJson: string):
  | { success: true; value: unknown }
  | { success: false; error: JsonErrorDetails } {
  try {
    return { success: true, value: JSON.parse(rawJson) };
  } catch (error) {
    return {
      success: false,
      error: parseJsonError(rawJson, error)
    };
  }
}

function toOverlayDocument(rootValue: unknown, sourceJsonRaw: string): OverlayParseResult {
  const root = asObject(rootValue);
  if (!root) {
    return fail("JSON root must be an object.", sourceJsonRaw);
  }

  const pipelineSteps = asObject(root.pipeline_steps);
  if (!pipelineSteps) {
    return fail('Missing required object at key "pipeline_steps".', sourceJsonRaw);
  }

  const layoutDetection = pipelineSteps.layout_detection;
  if (!Array.isArray(layoutDetection)) {
    return fail('Missing required array at key "pipeline_steps.layout_detection".', sourceJsonRaw);
  }

  const contentExtraction = pipelineSteps.content_extraction;
  if (!Array.isArray(contentExtraction)) {
    return fail('Missing required array at key "pipeline_steps.content_extraction".', sourceJsonRaw);
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
    const contentPage = parseContentPage(contentPageValue, pageIndex, contentSequenceMap);

    // Viewer pages are 1-based; source arrays are 0-based.
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
      assertNormalizedBboxContract(bbox, `pipeline_steps.layout_detection[${pageIndex}].regions[${regionIndex}]`);

      const matched = findContentMatch(contentPage, bbox);
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
        entities: matched?.entities ?? [],
        metadata: {
          pageNumber: matched?.pageNumber ?? (matched?.source.pageIndex ?? pageIndex),
          regionId: matched?.regionId ?? matched?.sequenceId ?? null
        },
        layoutSource: {
          pageIndex,
          regionIndex
        },
        contentSource: matched?.source ?? null
      };

      return region;
    });

    return {
      pageNumber,
      regions: overlayRegions
    };
  });

  logOverlayParseSummary(pages);

  return {
    success: true,
    document: {
      pages
    },
    sourceJsonRaw,
    sourceRoot: root
  };
}

export function parseOverlayInput(rawJson: string): OverlayParseResult {
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

  const parsed = parseJson(trimmed);
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
    return toOverlayDocument(parsed.value, rawJson);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not parse overlay JSON.", rawJson);
  }
}
