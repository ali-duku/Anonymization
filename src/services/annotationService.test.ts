import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BrowserAnnotationService } from "./annotationService";

describe("BrowserAnnotationService", () => {
  const service = new BrowserAnnotationService();

  it("parses the sample OCR JSON and builds page overlays", () => {
    const sampleJson = readFileSync(
      "moj-shour_human-poc/ocr_output/results_20260312_150534.json",
      "utf-8"
    );

    const result = service.parseOverlayInput(sampleJson);

    expect(result.success).toBe(true);
    expect(result.document).not.toBeNull();
    expect(result.document?.pages).toHaveLength(15);
    const totalRegions = result.document?.pages.reduce((sum, page) => sum + page.regions.length, 0);
    expect(totalRegions).toBe(364);
  });

  it("keeps layout regions even when no content match exists", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
                label: "Picture"
              }
            ]
          }
        ],
        content_extraction: [[]]
      }
    });

    const result = service.parseOverlayInput(raw);
    expect(result.success).toBe(true);
    expect(result.document?.pages[0].regions[0]).toMatchObject({
      matchedContent: false,
      text: "",
      label: "Picture",
      metadata: { pageNumber: 0, regionId: null }
    });
  });

  it("matches content bbox values when only tiny float differences exist", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [
            {
              bbox: { x1: 0.10000005, y1: 0.20000004, x2: 0.30000005, y2: 0.40000003 },
              text: "Matched text",
              region_label: "Text",
              metadata: { page_number: 1, region_id: 5 }
            }
          ]
        ]
      }
    });

    const result = service.parseOverlayInput(raw);
    expect(result.success).toBe(true);
    expect(result.document?.pages[0].regions[0]).toMatchObject({
      matchedContent: true,
      text: "Matched text",
      metadata: { pageNumber: 1, regionId: 5 }
    });
  });

  it("returns actionable errors for invalid pipeline shape", () => {
    const raw = JSON.stringify({ result: "ok" });
    const result = service.parseOverlayInput(raw);

    expect(result.success).toBe(false);
    expect(result.document).toBeNull();
    expect(result.error?.message).toContain("pipeline_steps");
  });

  it("uses global content sequence id when matched metadata.region_id is missing", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [
            {
              bbox: { x1: 0.01, y1: 0.02, x2: 0.03, y2: 0.04 },
              text: "first",
              region_label: "Text",
              metadata: { page_number: 0, region_id: 1 }
            },
            {
              bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
              text: "second",
              region_label: "Text",
              metadata: { page_number: 0 }
            }
          ]
        ]
      }
    });

    const result = service.parseOverlayInput(raw);
    expect(result.success).toBe(true);
    expect(result.document?.pages[0].regions[0]).toMatchObject({
      matchedContent: true,
      metadata: { pageNumber: 0, regionId: 2 }
    });
  });

  it("falls back to source page index when matched metadata.page_number is missing", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: []
          },
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [],
          [
            {
              bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
              text: "Matched text",
              region_label: "Text",
              metadata: { region_id: 5 }
            }
          ]
        ]
      }
    });

    const result = service.parseOverlayInput(raw);
    expect(result.success).toBe(true);
    expect(result.document?.pages[1].regions[0].metadata.pageNumber).toBe(1);
  });

  it("patches edited bbox values into layout and matched content on generate", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [
            {
              bbox: { x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
              text: "abc",
              region_label: "Text",
              metadata: { page_number: 1, region_id: 11 }
            }
          ]
        ]
      }
    });

    const parsed = service.parseOverlayInput(raw);
    expect(parsed.success).toBe(true);
    expect(parsed.document).not.toBeNull();
    expect(parsed.sourceRoot).not.toBeNull();

    const document = parsed.document!;
    document.pages[0].regions[0].bbox = {
      x1: 0.123456789,
      y1: 0.234567891,
      x2: 0.923456789,
      y2: 0.934567891
    };

    const generated = service.generateWithOverlayEdits(parsed.sourceRoot!, document);
    expect(generated.success).toBe(true);
    expect(generated.formattedJson).toContain("\n");
    const root = JSON.parse(generated.formattedJson ?? "{}");

    expect(root.pipeline_steps.layout_detection[0].regions[0].bbox).toEqual({
      x1: 0.123457,
      y1: 0.234568,
      x2: 0.923457,
      y2: 0.934568
    });
    expect(root.pipeline_steps.content_extraction[0][0].bbox).toEqual({
      x1: 0.123457,
      y1: 0.234568,
      x2: 0.923457,
      y2: 0.934568
    });
    expect(root.pipeline_steps.content_extraction[0][0].metadata).toEqual({
      page_number: 0,
      region_id: 11
    });
  });

  it("patches only layout when no content match exists", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.2, y1: 0.2, x2: 0.5, y2: 0.5 },
                label: "Picture"
              }
            ]
          }
        ],
        content_extraction: [[]]
      }
    });

    const parsed = service.parseOverlayInput(raw);
    expect(parsed.success).toBe(true);
    expect(parsed.document).not.toBeNull();
    expect(parsed.sourceRoot).not.toBeNull();

    const document = parsed.document!;
    document.pages[0].regions[0].bbox = {
      x1: -0.2,
      y1: 0.05,
      x2: 2.3,
      y2: 0.5000000001
    };

    const generated = service.generateWithOverlayEdits(parsed.sourceRoot!, document);
    expect(generated.success).toBe(true);
    const root = JSON.parse(generated.formattedJson ?? "{}");

    expect(root.pipeline_steps.layout_detection[0].regions[0].bbox).toEqual({
      x1: 0,
      y1: 0.05,
      x2: 1,
      y2: 0.5
    });
    expect(root.pipeline_steps.content_extraction[0]).toEqual([]);
  });

  it("normalizes content metadata page_number to 0-index and assigns fallback region_id in output", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.3, y1: 0.3, x2: 0.5, y2: 0.5 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [
            {
              bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
              text: "first",
              region_label: "Text",
              metadata: { page_number: 99, region_id: 999 }
            },
            {
              bbox: { x1: 0.3, y1: 0.3, x2: 0.5, y2: 0.5 },
              text: "second",
              region_label: "Text",
              metadata: {}
            }
          ]
        ]
      }
    });

    const parsed = service.parseOverlayInput(raw);
    expect(parsed.success).toBe(true);
    expect(parsed.document).not.toBeNull();
    expect(parsed.sourceRoot).not.toBeNull();

    const generated = service.generateWithOverlayEdits(parsed.sourceRoot!, parsed.document!);
    expect(generated.success).toBe(true);
    const root = JSON.parse(generated.formattedJson ?? "{}");
    expect(root.pipeline_steps.content_extraction[0][1].metadata).toEqual({
      page_number: 0,
      region_id: 2
    });
    expect(root.pipeline_steps.content_extraction[0][0].metadata).toEqual({
      page_number: 99,
      region_id: 999
    });
  });
});
