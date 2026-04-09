import type { OverlayEntitySpan } from "../../../types/overlay";

export type SpanBoundarySide = "start" | "end";

export interface SpanBoundaryLimits {
  minStart: number;
  maxStart: number;
  minEnd: number;
  maxEnd: number;
}

export interface SpanBoundaryState {
  index: number;
  start: number;
  end: number;
  limits: SpanBoundaryLimits;
}

export function getSpanBoundaryState(
  spans: readonly OverlayEntitySpan[],
  index: number,
  textLength: number
): SpanBoundaryState | null {
  const span = spans[index];
  if (!span) {
    return null;
  }

  const previous = index > 0 ? spans[index - 1] : null;
  const next = index < spans.length - 1 ? spans[index + 1] : null;

  const limits: SpanBoundaryLimits = {
    minStart: previous?.end ?? 0,
    maxStart: span.end - 1,
    minEnd: span.start + 1,
    maxEnd: next?.start ?? textLength
  };

  return {
    index,
    start: span.start,
    end: span.end,
    limits
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function buildBoundaryAdjustedSpans(
  spans: readonly OverlayEntitySpan[],
  index: number,
  side: SpanBoundarySide,
  nextBoundaryValue: number,
  textLength: number
): OverlayEntitySpan[] | null {
  const state = getSpanBoundaryState(spans, index, textLength);
  if (!state) {
    return null;
  }

  const nextSpans = spans.map((span) => ({ ...span }));
  const nextSpan = nextSpans[index];
  if (!nextSpan) {
    return null;
  }

  if (side === "start") {
    const clampedStart = clamp(nextBoundaryValue, state.limits.minStart, state.limits.maxStart);
    if (clampedStart === nextSpan.start) {
      return nextSpans;
    }
    nextSpan.start = clampedStart;
  } else {
    const clampedEnd = clamp(nextBoundaryValue, state.limits.minEnd, state.limits.maxEnd);
    if (clampedEnd === nextSpan.end) {
      return nextSpans;
    }
    nextSpan.end = clampedEnd;
  }

  return nextSpans;
}
