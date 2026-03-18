import { normalizeEntitySpansForText } from "../../constants/anonymizationEntities";
import type { NormalizedBbox, OverlaySourceRef } from "../../types/overlay";
import {
  asObject,
  buildContentSequenceMap,
  buildExactBboxKey,
  buildRoundedBboxKey,
  buildSourceKey,
  isWithinTolerance,
  toNormalizedBbox,
  toNumericOrNull
} from "./annotation.helpers";
import type { ParsedContentRegion } from "./annotation.types";

export function parseContentPage(
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
    const textValue = typeof region.text === "string" ? region.text : "";
    return {
      bbox,
      text: textValue,
      entities: normalizeEntitySpansForText(region.entities, textValue),
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

export function findContentMatch(
  contentRegions: ParsedContentRegion[],
  layoutBbox: NormalizedBbox
): ParsedContentRegion | null {
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

export function buildSnapshotLayoutToContentMap(
  layoutDetection: unknown[],
  contentExtraction: unknown[]
): Map<string, OverlaySourceRef> {
  const layoutToContent = new Map<string, OverlaySourceRef>();
  const contentSequenceMap = buildContentSequenceMap(contentExtraction);

  for (let pageIndex = 0; pageIndex < layoutDetection.length; pageIndex += 1) {
    const pageObject = asObject(layoutDetection[pageIndex]);
    if (!pageObject) {
      continue;
    }

    const regions = pageObject.regions;
    if (!Array.isArray(regions)) {
      continue;
    }

    const contentPage = parseContentPage(contentExtraction[pageIndex], pageIndex, contentSequenceMap);
    for (let regionIndex = 0; regionIndex < regions.length; regionIndex += 1) {
      const regionObject = asObject(regions[regionIndex]);
      if (!regionObject) {
        continue;
      }

      const bbox = toNormalizedBbox(regionObject.bbox);
      if (!bbox) {
        continue;
      }

      const matched = findContentMatch(contentPage, bbox);
      if (!matched) {
        continue;
      }

      layoutToContent.set(buildSourceKey(pageIndex, regionIndex), matched.source);
    }
  }

  return layoutToContent;
}
