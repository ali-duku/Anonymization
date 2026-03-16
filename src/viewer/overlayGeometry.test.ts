import { describe, expect, it } from "vitest";
import {
  computeNormalizedMinimumSize,
  moveBboxWithinPage,
  resizeBboxWithinPage
} from "./overlayGeometry";

describe("overlayGeometry", () => {
  it("computes normalized minimum size from pixel threshold", () => {
    const minimum = computeNormalizedMinimumSize(500, 700, 10);

    expect(minimum.width).toBeCloseTo(0.02, 6);
    expect(minimum.height).toBeCloseTo(10 / 700, 6);
  });

  it("moves bbox while clamping to page bounds", () => {
    const moved = moveBboxWithinPage(
      { x1: 0.7, y1: 0.7, x2: 0.95, y2: 0.95 },
      { x: 0.4, y: 0.4 }
    );

    expect(moved.x1).toBeCloseTo(0.75, 6);
    expect(moved.y1).toBeCloseTo(0.75, 6);
    expect(moved.x2).toBeCloseTo(1, 6);
    expect(moved.y2).toBeCloseTo(1, 6);
  });

  it("resizes NW handle without flipping and enforces min size", () => {
    const minimum = computeNormalizedMinimumSize(500, 500, 10);
    const resized = resizeBboxWithinPage(
      { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
      { x: 0.5, y: 0.5 },
      "nw",
      minimum
    );

    expect(resized.x1).toBeLessThan(resized.x2);
    expect(resized.y1).toBeLessThan(resized.y2);
    expect(resized.x2 - resized.x1).toBeGreaterThanOrEqual(minimum.width - 1e-9);
    expect(resized.y2 - resized.y1).toBeGreaterThanOrEqual(minimum.height - 1e-9);
  });

  it("resizes SE handle while staying inside page", () => {
    const minimum = computeNormalizedMinimumSize(400, 800, 10);
    const resized = resizeBboxWithinPage(
      { x1: 0.8, y1: 0.8, x2: 0.9, y2: 0.95 },
      { x: 0.8, y: 0.8 },
      "se",
      minimum
    );

    expect(resized.x2).toBeLessThanOrEqual(1);
    expect(resized.y2).toBeLessThanOrEqual(1);
    expect(resized.x1).toBeLessThan(resized.x2);
    expect(resized.y1).toBeLessThan(resized.y2);
  });
});
