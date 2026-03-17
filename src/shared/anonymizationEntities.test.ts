import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ANONYMIZATION_ENTITY_LABELS,
  FALLBACK_ANONYMIZATION_ENTITY_LABEL,
  coerceEntityLabel,
  hasEntityOverlap,
  normalizeEntitySpansForText
} from "./anonymizationEntities";

describe("shared anonymization entity utilities", () => {
  it("coerces unknown values to fallback label", () => {
    expect(coerceEntityLabel("unknown-entity")).toBe(FALLBACK_ANONYMIZATION_ENTITY_LABEL);
    expect(coerceEntityLabel("")).toBe(FALLBACK_ANONYMIZATION_ENTITY_LABEL);
    expect(coerceEntityLabel(null)).toBe(FALLBACK_ANONYMIZATION_ENTITY_LABEL);
  });

  it("normalizes spans: range-safe, non-overlapping, canonicalized entities", () => {
    const normalized = normalizeEntitySpansForText(
      [
        { start: 2, end: 5, entity: "invalid-entity" },
        { start: 0, end: 2, entity: "invalid-entity-2" },
        { start: 1, end: 3, entity: "overlap-drop" },
        { start: -1, end: 1, entity: "drop-negative" },
        { start: 7, end: 7, entity: "drop-zero-length" }
      ],
      "01234567"
    );

    expect(normalized).toEqual([
      { start: 0, end: 2, entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL },
      { start: 2, end: 5, entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL }
    ]);
  });

  it("detects overlap and supports ignore index", () => {
    const spans = [
      { start: 0, end: 2, entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL },
      { start: 3, end: 5, entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL }
    ];

    expect(hasEntityOverlap(spans, 1, 4)).toBe(true);
    expect(hasEntityOverlap(spans, 1, 4, 0)).toBe(true);
    expect(hasEntityOverlap(spans, 1, 2, 0)).toBe(false);
  });

  it("includes all entities discovered in anonymised OCR fixture", () => {
    const raw = readFileSync(
      "moj-shour_human-poc/ocr_output/results_20260312_150534_anonymised.json",
      "utf-8"
    );
    const root = JSON.parse(raw) as {
      pipeline_steps?: {
        content_extraction?: Array<
          Array<{
            entities?: Array<{ entity?: string }>;
          }>
        >;
      };
    };

    const discovered = new Set<string>();
    for (const page of root.pipeline_steps?.content_extraction ?? []) {
      for (const region of page) {
        for (const entity of region.entities ?? []) {
          if (typeof entity.entity === "string") {
            discovered.add(entity.entity);
          }
        }
      }
    }

    for (const entity of discovered) {
      expect(ANONYMIZATION_ENTITY_LABELS).toContain(entity);
    }
  });
});
