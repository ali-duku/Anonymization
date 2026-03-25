/**
 * Fixed, developer-maintained label catalog for region editing.
 * Extend this list when introducing new supported OCR region labels.
 */
export const REGION_LABEL_OPTIONS = [
  "Formula",
  "List-item",
  "Page-footer",
  "Page-header",
  "Picture",
  "Section-header",
  "Table",
  "Text"
] as const;

export type RegionLabelOption = (typeof REGION_LABEL_OPTIONS)[number];

export function buildRegionLabelOptions(currentLabel: string): readonly string[] {
  const isKnownOption = REGION_LABEL_OPTIONS.includes(currentLabel as RegionLabelOption);
  if (!currentLabel || isKnownOption) {
    return REGION_LABEL_OPTIONS;
  }
  return [currentLabel, ...REGION_LABEL_OPTIONS];
}
