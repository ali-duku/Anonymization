import { useCallback, useMemo, useState } from "react";
import type { OverlayRegion } from "../../../types/overlay";
import { writeTextToClipboard } from "../../../utils/clipboard";
import { addRegionToDocument, buildNextRegionId } from "../utils/overlayDocument";
import { buildBboxClipboardPayload, buildRegionEditsFromBboxClipboardPayload } from "../utils/bboxClipboard";
import type { BboxClipboardPayload, UseBboxClipboardOptions } from "./useBboxClipboard.types";

export function useBboxClipboard({
  overlayDocument,
  currentPage,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: UseBboxClipboardOptions) {
  const [copiedBbox, setCopiedBbox] = useState<BboxClipboardPayload | null>(null);

  const hasCopiedBbox = useMemo(() => copiedBbox !== null, [copiedBbox]);

  const copyBbox = useCallback((region: OverlayRegion) => {
    setCopiedBbox(buildBboxClipboardPayload(region));
  }, []);

  const copyTextOnly = useCallback(async (region: OverlayRegion) => {
    await writeTextToClipboard(region.text || "");
  }, []);

  const pasteCopiedBbox = useCallback(() => {
    if (!copiedBbox || !overlayDocument || !onOverlayDocumentSaved) {
      return;
    }

    const edits = buildRegionEditsFromBboxClipboardPayload(copiedBbox);
    const nextRegion: OverlayRegion = {
      id: buildNextRegionId(overlayDocument, currentPage),
      pageNumber: currentPage,
      label: edits.label,
      bbox: edits.bbox,
      matchedContent: false,
      text: edits.text,
      entities: edits.entities,
      metadata: {
        pageNumber: Math.max(0, currentPage - 1),
        regionId: null
      },
      layoutSource: null,
      contentSource: null
    };

    onOverlayEditStarted?.();
    onOverlayDocumentSaved(addRegionToDocument(overlayDocument, currentPage, nextRegion));
  }, [copiedBbox, currentPage, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument]);

  return {
    copiedBbox,
    hasCopiedBbox,
    copyBbox,
    copyTextOnly,
    pasteCopiedBbox
  };
}
