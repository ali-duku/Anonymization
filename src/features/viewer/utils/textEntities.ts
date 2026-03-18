import type { OverlayEntitySpan } from "../../../types/overlay";
import { normalizeEntitySpansForText, sortEntitySpans } from "../../../constants/anonymizationEntities";

export interface PendingSelectionRange {
  start: number;
  end: number;
  text: string;
}

export interface TextSegment {
  text: string;
  entityIndex: number | null;
  entity: string | null;
  start: number | null;
  end: number | null;
}

export function remapEntitySpansAfterTextChange(
  previousText: string,
  nextText: string,
  spans: OverlayEntitySpan[]
): { spans: OverlayEntitySpan[]; droppedCount: number } {
  if (previousText === nextText) {
    return { spans: normalizeEntitySpansForText(spans, nextText), droppedCount: 0 };
  }

  let start = 0;
  while (
    start < previousText.length &&
    start < nextText.length &&
    previousText.charCodeAt(start) === nextText.charCodeAt(start)
  ) {
    start += 1;
  }

  let previousSuffixIndex = previousText.length;
  let nextSuffixIndex = nextText.length;
  while (
    previousSuffixIndex > start &&
    nextSuffixIndex > start &&
    previousText.charCodeAt(previousSuffixIndex - 1) === nextText.charCodeAt(nextSuffixIndex - 1)
  ) {
    previousSuffixIndex -= 1;
    nextSuffixIndex -= 1;
  }

  const removedCount = previousSuffixIndex - start;
  const insertedCount = nextSuffixIndex - start;
  const delta = insertedCount - removedCount;
  const changedEnd = start + removedCount;

  const remapped: OverlayEntitySpan[] = [];
  let droppedCount = 0;

  for (const span of spans) {
    if (span.end <= start) {
      remapped.push(span);
      continue;
    }

    if (span.start >= changedEnd) {
      remapped.push({
        ...span,
        start: span.start + delta,
        end: span.end + delta
      });
      continue;
    }

    if (span.start < start && span.end > changedEnd) {
      const nextEnd = span.end + delta;
      if (nextEnd > span.start) {
        remapped.push({
          ...span,
          end: nextEnd
        });
      } else {
        droppedCount += 1;
      }
      continue;
    }

    if (span.start < start && span.end > start && span.end <= changedEnd) {
      const nextEnd = start;
      if (nextEnd > span.start) {
        remapped.push({
          ...span,
          end: nextEnd
        });
      } else {
        droppedCount += 1;
      }
      continue;
    }

    if (span.start >= start && span.start < changedEnd && span.end > changedEnd) {
      const nextStart = start + insertedCount;
      const nextEnd = span.end + delta;
      if (nextEnd > nextStart) {
        remapped.push({
          ...span,
          start: nextStart,
          end: nextEnd
        });
      } else {
        droppedCount += 1;
      }
      continue;
    }

    droppedCount += 1;
  }

  const normalized = normalizeEntitySpansForText(remapped, nextText);
  droppedCount += Math.max(0, remapped.length - normalized.length);
  return { spans: normalized, droppedCount };
}

export function getTextareaSelectionOffsets(
  textarea: HTMLTextAreaElement,
  text: string
): PendingSelectionRange | null {
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  if (
    typeof selectionStart !== "number" ||
    typeof selectionEnd !== "number" ||
    selectionStart === selectionEnd
  ) {
    return null;
  }

  const start = Math.max(0, Math.min(selectionStart, selectionEnd));
  const end = Math.max(start, Math.max(selectionStart, selectionEnd));
  if (end > text.length) {
    return null;
  }

  return {
    start,
    end,
    text: text.slice(start, end)
  };
}

export function buildTextSegments(text: string, entities: OverlayEntitySpan[]): TextSegment[] {
  const segments: TextSegment[] = [];
  const normalizedEntities = sortEntitySpans(entities);
  let cursor = 0;

  normalizedEntities.forEach((entity, index) => {
    if (entity.start > cursor) {
      segments.push({
        text: text.slice(cursor, entity.start),
        entityIndex: null,
        entity: null,
        start: null,
        end: null
      });
    }
    segments.push({
      text: text.slice(entity.start, entity.end),
      entityIndex: index,
      entity: entity.entity,
      start: entity.start,
      end: entity.end
    });
    cursor = entity.end;
  });

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      entityIndex: null,
      entity: null,
      start: null,
      end: null
    });
  }

  if (segments.length === 0) {
    segments.push({
      text: "",
      entityIndex: null,
      entity: null,
      start: null,
      end: null
    });
  }

  return segments;
}

export function areEntitySpansEqual(left: OverlayEntitySpan[], right: OverlayEntitySpan[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (
      left[index].start !== right[index].start ||
      left[index].end !== right[index].end ||
      left[index].entity !== right[index].entity
    ) {
      return false;
    }
  }
  return true;
}
