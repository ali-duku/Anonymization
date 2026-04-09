import type { OverlayDocument, OverlayRegion } from "../../../../types/overlay";

export function resolveActiveRegion(
  overlayDocument: OverlayDocument | null,
  activeRegionId: string | null
): OverlayRegion | null {
  if (!activeRegionId || !overlayDocument) {
    return null;
  }

  for (const page of overlayDocument.pages) {
    const region = page.regions.find((item) => item.id === activeRegionId);
    if (region) {
      return region;
    }
  }

  return null;
}
