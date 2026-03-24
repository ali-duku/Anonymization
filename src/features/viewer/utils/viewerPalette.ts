import type { CSSProperties } from "react";
import type { NormalizedBbox, OverlayRegion } from "../../../types/overlay";
import { LABEL_HUES } from "../constants/viewerConstants";
import { normalizedBboxToPercentRect } from "./bboxProjection";

export interface LabelPalette {
  border: string;
  fillMatched: string;
  fillUnmatched: string;
  buttonBackground: string;
  buttonText: string;
}

function hashLabelToHue(label: string): number {
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
}

export function buildPalette(label: string): LabelPalette {
  const normalized = label.trim().toLowerCase();
  const hue = LABEL_HUES[normalized] ?? hashLabelToHue(normalized || "unknown");
  return {
    border: `hsl(${hue} 78% 62%)`,
    fillMatched: `hsl(${hue} 78% 62% / 0.2)`,
    fillUnmatched: `hsl(${hue} 78% 62% / 0.04)`,
    buttonBackground: `hsl(${hue} 88% 58% / 0.95)`,
    buttonText: "#08111a"
  };
}

export function toOverlayStyle(region: OverlayRegion, bbox: NormalizedBbox): CSSProperties {
  const palette = buildPalette(region.label);
  const rect = normalizedBboxToPercentRect(bbox);

  return {
    left: `${rect.left}%`,
    top: `${rect.top}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
    borderColor: palette.border,
    backgroundColor: region.matchedContent ? palette.fillMatched : palette.fillUnmatched
  };
}
