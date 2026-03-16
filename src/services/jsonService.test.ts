import { describe, expect, it } from "vitest";
import { BrowserJsonService } from "./jsonService";

describe("BrowserJsonService", () => {
  const service = new BrowserJsonService();

  it("formats valid JSON without changing values", () => {
    const input = '{"name":"anonymizer","active":true,"items":[1,2,3]}';
    const result = service.generate(input);

    expect(result.success).toBe(true);
    expect(result.formattedJson).toBe(
      '{\n  "name": "anonymizer",\n  "active": true,\n  "items": [\n    1,\n    2,\n    3\n  ]\n}'
    );
  });

  it("returns actionable details for invalid JSON", () => {
    const input = '{"name":"broken",}';
    const result = service.generate(input);

    expect(result.success).toBe(false);
    expect(result.formattedJson).toBe("");
    expect(result.error?.message.toLowerCase()).toContain("json");
    expect(result.error?.line).toBeGreaterThanOrEqual(1);
    expect(result.error?.column).toBeGreaterThanOrEqual(1);
  });
});
