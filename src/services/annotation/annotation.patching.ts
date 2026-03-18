import { normalizeEntitySpansForText } from "../../constants/anonymizationEntities";
import type { NormalizedBbox, OverlayEntitySpan, OverlaySourceRef } from "../../types/overlay";
import {
  asObject,
  buildSourceKey,
  ensurePageArray,
  toNumericOrNull
} from "./annotation.helpers";

export function appendLayoutRegion(
  contentExtraction: unknown[],
  layoutDetection: unknown[],
  pageNumber: number,
  nextBbox: NormalizedBbox,
  nextLabel: string
): void {
  const pageIndex = Math.max(0, pageNumber - 1);
  while (layoutDetection.length <= pageIndex) {
    layoutDetection.push({ regions: [] });
  }

  const pageObject = asObject(layoutDetection[pageIndex]);
  if (!pageObject) {
    throw new Error(`Layout page index ${pageIndex} is not available in loaded snapshot.`);
  }

  if (!Array.isArray(pageObject.regions)) {
    pageObject.regions = [];
  }
  const regions = pageObject.regions;
  if (!Array.isArray(regions)) {
    throw new Error(`Layout page index ${pageIndex} is missing a regions array in loaded snapshot.`);
  }

  regions.push({
    bbox: { ...nextBbox },
    label: nextLabel
  });

  ensurePageArray(contentExtraction, pageIndex);
}

export function buildDeletedLayoutKeys(
  layoutDetection: unknown[],
  keptLayoutKeys: Set<string>
): Set<string> {
  const deleted = new Set<string>();

  for (let pageIndex = 0; pageIndex < layoutDetection.length; pageIndex += 1) {
    const pageObject = asObject(layoutDetection[pageIndex]);
    if (!pageObject) {
      continue;
    }

    const regions = pageObject.regions;
    if (!Array.isArray(regions)) {
      continue;
    }

    for (let regionIndex = 0; regionIndex < regions.length; regionIndex += 1) {
      const key = buildSourceKey(pageIndex, regionIndex);
      if (!keptLayoutKeys.has(key)) {
        deleted.add(key);
      }
    }
  }

  return deleted;
}

export function pruneLayoutRegions(layoutDetection: unknown[], deletedLayoutKeys: Set<string>): void {
  for (let pageIndex = 0; pageIndex < layoutDetection.length; pageIndex += 1) {
    const pageObject = asObject(layoutDetection[pageIndex]);
    if (!pageObject) {
      continue;
    }

    const regions = pageObject.regions;
    if (!Array.isArray(regions)) {
      continue;
    }

    pageObject.regions = regions.filter(
      (_region, regionIndex) => !deletedLayoutKeys.has(buildSourceKey(pageIndex, regionIndex))
    );
  }
}

export function pruneContentRegions(contentExtraction: unknown[], deletedContentKeys: Set<string>): void {
  for (let pageIndex = 0; pageIndex < contentExtraction.length; pageIndex += 1) {
    const page = contentExtraction[pageIndex];
    if (!Array.isArray(page)) {
      continue;
    }

    contentExtraction[pageIndex] = page.filter(
      (_region, regionIndex) => !deletedContentKeys.has(buildSourceKey(pageIndex, regionIndex))
    );
  }
}

export function normalizeContentEntitiesArrays(contentExtraction: unknown[]): void {
  for (let pageIndex = 0; pageIndex < contentExtraction.length; pageIndex += 1) {
    const page = contentExtraction[pageIndex];
    if (!Array.isArray(page)) {
      continue;
    }

    for (let regionIndex = 0; regionIndex < page.length; regionIndex += 1) {
      const region = asObject(page[regionIndex]);
      if (!region) {
        continue;
      }
      const text = typeof region.text === "string" ? region.text : "";
      region.entities = normalizeEntitySpansForText(region.entities, text);
    }
  }
}

export function patchLayoutRegion(
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

export function patchContentRegion(
  contentExtraction: unknown[],
  source: OverlaySourceRef,
  nextBbox: NormalizedBbox,
  sequenceId: number | null,
  nextLabel: string,
  nextText: string,
  nextEntities: OverlayEntitySpan[]
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
  region.entities = normalizeEntitySpansForText(nextEntities, nextText);

  const existingMetadata = asObject(region.metadata);
  const metadata = existingMetadata ?? {};
  if (!existingMetadata) {
    region.metadata = metadata;
  }

  metadata.page_number = source.pageIndex;
  const existingRegionId = toNumericOrNull(metadata.region_id);
  metadata.region_id = existingRegionId ?? sequenceId;
}

export function appendContentRegion(
  contentExtraction: unknown[],
  pageIndex: number,
  nextBbox: NormalizedBbox,
  nextLabel: string,
  nextText: string,
  nextEntities: OverlayEntitySpan[],
  sequenceId: number
): void {
  const page = ensurePageArray(contentExtraction, pageIndex);

  page.push({
    bbox: { ...nextBbox },
    text: nextText,
    region_label: nextLabel,
    entities: normalizeEntitySpansForText(nextEntities, nextText),
    metadata: {
      page_number: pageIndex,
      region_id: sequenceId
    }
  });
}
