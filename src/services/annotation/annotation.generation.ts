import type { JsonGenerationResult } from "../../types/json";
import type { OverlayDocument } from "../../types/overlay";
import { buildSnapshotLayoutToContentMap } from "./annotation.matching";
import {
  appendContentRegion,
  appendLayoutRegion,
  buildDeletedLayoutKeys,
  normalizeContentEntitiesArrays,
  patchContentRegion,
  patchLayoutRegion,
  pruneContentRegions,
  pruneLayoutRegions
} from "./annotation.patching";
import {
  asObject,
  buildContentSequenceMap,
  buildSourceKey,
  cloneRoot,
  collectKeptSourceKeys,
  sanitizeBboxForPatch
} from "./annotation.helpers";

export function generateWithOverlayEdits(
  sourceRoot: Record<string, unknown>,
  document: OverlayDocument
): JsonGenerationResult {
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

    const keptSourceKeys = collectKeptSourceKeys(document);
    const snapshotLayoutToContent = buildSnapshotLayoutToContentMap(layoutDetection, contentExtraction);
    const deletedLayoutKeys = buildDeletedLayoutKeys(layoutDetection, keptSourceKeys.layout);
    const deletedContentKeys = new Set<string>();

    for (const deletedLayoutKey of deletedLayoutKeys) {
      const mappedContent = snapshotLayoutToContent.get(deletedLayoutKey);
      if (mappedContent) {
        deletedContentKeys.add(buildSourceKey(mappedContent.pageIndex, mappedContent.regionIndex));
      }
    }

    const contentSequenceMap = buildContentSequenceMap(contentExtraction);
    let nextSequenceId = contentSequenceMap.size + 1;

    for (const page of document.pages) {
      for (const region of page.regions) {
        const nextBbox = sanitizeBboxForPatch(region.bbox);

        if (region.layoutSource) {
          patchLayoutRegion(layoutDetection, region.layoutSource, nextBbox, region.label);
        } else {
          appendLayoutRegion(contentExtraction, layoutDetection, region.pageNumber, nextBbox, region.label);
        }

        if (region.contentSource) {
          const sequenceId =
            contentSequenceMap.get(
              buildSourceKey(region.contentSource.pageIndex, region.contentSource.regionIndex)
            ) ?? null;
          patchContentRegion(
            contentExtraction,
            region.contentSource,
            nextBbox,
            sequenceId,
            region.label,
            region.text,
            region.entities
          );
        } else {
          appendContentRegion(
            contentExtraction,
            region.pageNumber - 1,
            nextBbox,
            region.label,
            region.text,
            region.entities,
            nextSequenceId
          );
          nextSequenceId += 1;
        }
      }
    }

    pruneLayoutRegions(layoutDetection, deletedLayoutKeys);
    pruneContentRegions(contentExtraction, deletedContentKeys);
    normalizeContentEntitiesArrays(contentExtraction);

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
