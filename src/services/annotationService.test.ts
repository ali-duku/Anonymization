import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FALLBACK_ANONYMIZATION_ENTITY_LABEL } from "../shared/anonymizationEntities";
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

  it("patches edited bbox, label, and text into layout and matched content on generate", () => {
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
    document.pages[0].regions[0].label = "Table";
    document.pages[0].regions[0].text = "updated text";

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
    expect(root.pipeline_steps.layout_detection[0].regions[0].label).toBe("Table");
    expect(root.pipeline_steps.content_extraction[0][0].bbox).toEqual({
      x1: 0.123457,
      y1: 0.234568,
      x2: 0.923457,
      y2: 0.934568
    });
    expect(root.pipeline_steps.content_extraction[0][0].region_label).toBe("Table");
    expect(root.pipeline_steps.content_extraction[0][0].text).toBe("updated text");
    expect(root.pipeline_steps.content_extraction[0][0].entities).toEqual([]);
    expect(root.pipeline_steps.content_extraction[0][0].metadata).toEqual({
      page_number: 0,
      region_id: 11
    });
  });

  it("creates content output entry when no content match exists", () => {
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
    document.pages[0].regions[0].label = "Section-header";
    document.pages[0].regions[0].text = "new content text";

    const generated = service.generateWithOverlayEdits(parsed.sourceRoot!, document);
    expect(generated.success).toBe(true);
    const root = JSON.parse(generated.formattedJson ?? "{}");

    expect(root.pipeline_steps.layout_detection[0].regions[0].bbox).toEqual({
      x1: 0,
      y1: 0.05,
      x2: 1,
      y2: 0.5
    });
    expect(root.pipeline_steps.layout_detection[0].regions[0].label).toBe("Section-header");
    expect(root.pipeline_steps.content_extraction[0]).toHaveLength(1);
    expect(root.pipeline_steps.content_extraction[0][0]).toEqual({
      bbox: {
        x1: 0,
        y1: 0.05,
        x2: 1,
        y2: 0.5
      },
      text: "new content text",
      region_label: "Section-header",
      entities: [],
      metadata: {
        page_number: 0,
        region_id: 1
      }
    });
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

  it("removes deleted overlay regions from layout_detection and matched content_extraction", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
                label: "Text"
              },
              {
                bbox: { x1: 0.3, y1: 0.3, x2: 0.4, y2: 0.4 },
                label: "Table"
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
              metadata: { page_number: 0, region_id: 1 }
            },
            {
              bbox: { x1: 0.3, y1: 0.3, x2: 0.4, y2: 0.4 },
              text: "second",
              region_label: "Table",
              metadata: { page_number: 0, region_id: 2 }
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
    document.pages[0].regions = [document.pages[0].regions[1]];

    const generated = service.generateWithOverlayEdits(parsed.sourceRoot!, document);
    expect(generated.success).toBe(true);
    const root = JSON.parse(generated.formattedJson ?? "{}");

    expect(root.pipeline_steps.layout_detection[0].regions).toHaveLength(1);
    expect(root.pipeline_steps.layout_detection[0].regions[0]).toMatchObject({
      label: "Table",
      bbox: { x1: 0.3, y1: 0.3, x2: 0.4, y2: 0.4 }
    });

    expect(root.pipeline_steps.content_extraction[0]).toHaveLength(1);
    expect(root.pipeline_steps.content_extraction[0][0]).toMatchObject({
      text: "second",
      region_label: "Table",
      bbox: { x1: 0.3, y1: 0.3, x2: 0.4, y2: 0.4 },
      entities: [],
      metadata: { page_number: 0, region_id: 2 }
    });
  });

  it("patches entities array into generated content_extraction output", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.3 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [
            {
              bbox: { x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.3 },
              text: "abcdef",
              region_label: "Text",
              metadata: { page_number: 0, region_id: 1 }
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
    document.pages[0].regions[0].entities = [
      {
        start: 1,
        end: 4,
        entity: "المدّعي"
      }
    ];

    const generated = service.generateWithOverlayEdits(parsed.sourceRoot!, document);
    expect(generated.success).toBe(true);
    const root = JSON.parse(generated.formattedJson ?? "{}");

    expect(root.pipeline_steps.content_extraction[0][0].entities).toEqual([
      {
        start: 1,
        end: 4,
        entity: "المدّعي"
      }
    ]);
  });
  it("parseOverlayInput canonicalizes unknown entity labels to fallback", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.3 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [
            {
              bbox: { x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.3 },
              text: "abcdef",
              region_label: "Text",
              entities: [{ start: 1, end: 4, entity: "not-canonical" }],
              metadata: { page_number: 0, region_id: 1 }
            }
          ]
        ]
      }
    });

    const parsed = service.parseOverlayInput(raw);
    expect(parsed.success).toBe(true);
    expect(parsed.document?.pages[0].regions[0].entities).toEqual([
      {
        start: 1,
        end: 4,
        entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL
      }
    ]);
  });

  it("generateWithOverlayEdits canonicalizes patched and appended entity labels", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
                label: "Text"
              },
              {
                bbox: { x1: 0.5, y1: 0.5, x2: 0.7, y2: 0.7 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [
            {
              bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
              text: "first text",
              region_label: "Text",
              metadata: { page_number: 0, region_id: 1 }
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
    document.pages[0].regions[0].entities = [{ start: 0, end: 5, entity: "patched-unknown" }];
    document.pages[0].regions[1].text = "second text";
    document.pages[0].regions[1].entities = [{ start: 0, end: 6, entity: "appended-unknown" }];

    const generated = service.generateWithOverlayEdits(parsed.sourceRoot!, document);
    expect(generated.success).toBe(true);
    const root = JSON.parse(generated.formattedJson ?? "{}");

    expect(root.pipeline_steps.content_extraction[0][0].entities).toEqual([
      { start: 0, end: 5, entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL }
    ]);
    expect(root.pipeline_steps.content_extraction[0][1].entities).toEqual([
      { start: 0, end: 6, entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL }
    ]);
  });

  it("appends new user-added regions to layout_detection and content_extraction output", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [{ regions: [] }],
        content_extraction: [[]]
      }
    });

    const parsed = service.parseOverlayInput(raw);
    expect(parsed.success).toBe(true);
    expect(parsed.document).not.toBeNull();
    expect(parsed.sourceRoot).not.toBeNull();

    const document = parsed.document!;
    document.pages[0].regions.push({
      id: "page-1-region-1",
      pageNumber: 1,
      label: "Text",
      bbox: { x1: 0.111111111, y1: 0.222222222, x2: 0.333333333, y2: 0.444444444 },
      matchedContent: false,
      text: "added content",
      entities: [{ start: 0, end: 5, entity: "unknown-added-entity" }],
      metadata: { pageNumber: 0, regionId: null },
      layoutSource: null,
      contentSource: null
    });

    const generated = service.generateWithOverlayEdits(parsed.sourceRoot!, document);
    expect(generated.success).toBe(true);
    const root = JSON.parse(generated.formattedJson ?? "{}");

    expect(root.pipeline_steps.layout_detection[0].regions).toHaveLength(1);
    expect(root.pipeline_steps.layout_detection[0].regions[0]).toEqual({
      bbox: { x1: 0.111111, y1: 0.222222, x2: 0.333333, y2: 0.444444 },
      label: "Text"
    });

    expect(root.pipeline_steps.content_extraction[0]).toHaveLength(1);
    expect(root.pipeline_steps.content_extraction[0][0]).toEqual({
      bbox: { x1: 0.111111, y1: 0.222222, x2: 0.333333, y2: 0.444444 },
      text: "added content",
      region_label: "Text",
      entities: [{ start: 0, end: 5, entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL }],
      metadata: {
        page_number: 0,
        region_id: 1
      }
    });
  });

  it("filters malformed entity spans without throwing", () => {
    const raw = JSON.stringify({
      pipeline_steps: {
        layout_detection: [
          {
            regions: [
              {
                bbox: { x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.3 },
                label: "Text"
              }
            ]
          }
        ],
        content_extraction: [
          [
            {
              bbox: { x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.3 },
              text: "abcdef",
              region_label: "Text",
              entities: [
                { start: -1, end: 2, entity: "bad-range" },
                { start: 1, end: 1, entity: "zero-length" },
                { start: 1, end: 3, entity: "bad-entity" },
                { start: 2, end: 4, entity: "overlap-drop" }
              ],
              metadata: { page_number: 0, region_id: 1 }
            }
          ]
        ]
      }
    });

    const parsed = service.parseOverlayInput(raw);
    expect(parsed.success).toBe(true);
    expect(parsed.document?.pages[0].regions[0].entities).toEqual([
      {
        start: 1,
        end: 3,
        entity: FALLBACK_ANONYMIZATION_ENTITY_LABEL
      }
    ]);
  });
});
