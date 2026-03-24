import type {
  NormalizedBbox,
  OverlayDocument,
  OverlayEntitySpan,
  OverlayRegion
} from "../../../types/overlay";

export function hasBboxChanged(previous: NormalizedBbox, next: NormalizedBbox, epsilon: number): boolean {
  return (
    Math.abs(previous.x1 - next.x1) > epsilon ||
    Math.abs(previous.y1 - next.y1) > epsilon ||
    Math.abs(previous.x2 - next.x2) > epsilon ||
    Math.abs(previous.y2 - next.y2) > epsilon
  );
}

export function applyRegionBbox(
  document: OverlayDocument,
  pageNumber: number,
  regionId: string,
  bbox: NormalizedBbox
): OverlayDocument {
  let regionChanged = false;

  const nextPages = document.pages.map((page) => {
    if (page.pageNumber !== pageNumber) {
      return page;
    }

    const nextRegions = page.regions.map((region) => {
      if (region.id !== regionId) {
        return region;
      }

      regionChanged = true;
      return {
        ...region,
        bbox
      };
    });

    return regionChanged
      ? {
          ...page,
          regions: nextRegions
        }
      : page;
  });

  return regionChanged
    ? {
        pages: nextPages
      }
    : document;
}

export function applyRegionEdits(
  document: OverlayDocument,
  pageNumber: number,
  regionId: string,
  edits: { bbox?: NormalizedBbox; label?: string; text?: string; entities?: OverlayEntitySpan[] }
): OverlayDocument {
  let regionChanged = false;

  const nextPages = document.pages.map((page) => {
    if (page.pageNumber !== pageNumber) {
      return page;
    }

    const nextRegions = page.regions.map((region) => {
      if (region.id !== regionId) {
        return region;
      }

      regionChanged = true;
      return {
        ...region,
        ...(edits.bbox ? { bbox: edits.bbox } : {}),
        ...(typeof edits.label === "string" ? { label: edits.label } : {}),
        ...(typeof edits.text === "string" ? { text: edits.text } : {}),
        ...(Array.isArray(edits.entities) ? { entities: edits.entities } : {})
      };
    });

    return regionChanged
      ? {
          ...page,
          regions: nextRegions
        }
      : page;
  });

  return regionChanged
    ? {
        pages: nextPages
      }
    : document;
}

export function removeRegionFromDocument(
  document: OverlayDocument,
  pageNumber: number,
  regionId: string
): OverlayDocument {
  let regionChanged = false;

  const nextPages = document.pages.map((page) => {
    if (page.pageNumber !== pageNumber) {
      return page;
    }

    const nextRegions = page.regions.filter((region) => region.id !== regionId);
    if (nextRegions.length !== page.regions.length) {
      regionChanged = true;
      return {
        ...page,
        regions: nextRegions
      };
    }

    return page;
  });

  return regionChanged
    ? {
        pages: nextPages
      }
    : document;
}

export function addRegionToDocument(
  document: OverlayDocument,
  pageNumber: number,
  region: OverlayRegion
): OverlayDocument {
  const hasPage = document.pages.some((page) => page.pageNumber === pageNumber);
  if (!hasPage) {
    return {
      pages: [...document.pages, { pageNumber, regions: [region] }].sort((left, right) => left.pageNumber - right.pageNumber)
    };
  }

  const nextPages = document.pages.map((page) =>
    page.pageNumber === pageNumber
      ? {
          ...page,
          regions: [...page.regions, region]
        }
      : page
  );
  return {
    pages: nextPages
  };
}

export function buildNextRegionId(document: OverlayDocument, pageNumber: number): string {
  const page = document.pages.find((item) => item.pageNumber === pageNumber);
  if (!page) {
    return `page-${pageNumber}-region-1`;
  }

  const existingIds = new Set(page.regions.map((region) => region.id));
  let maxSequence = 0;
  const pattern = new RegExp(`^page-${pageNumber}-region-(\\d+)$`);

  for (const region of page.regions) {
    const match = pattern.exec(region.id);
    if (!match) {
      continue;
    }

    const sequence = Number(match[1]);
    if (Number.isInteger(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  let nextSequence = maxSequence + 1;
  let nextId = `page-${pageNumber}-region-${nextSequence}`;
  while (existingIds.has(nextId)) {
    nextSequence += 1;
    nextId = `page-${pageNumber}-region-${nextSequence}`;
  }

  return nextId;
}
