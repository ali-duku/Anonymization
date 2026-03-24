import type { OverlayEntitySpan } from "../types/overlay";

export const ANONYMIZATION_ENTITY_LABELS = [
  "رقم الهوية الشخصية",
  "رقم الجوال",
  "رقم الهاتف",
  "البريد الإلكتروني",
  "العنوان",
  "رقم الموظف / الرقم الوظيفي",
  "رقم المنشأة / المؤسسة",
  "رقم الحساب البنكي",
  "تاريخ الميلاد",
  "رقم جواز السفر",
  "التوقيع",
  "رقم الآيبان",
  "صورة جواز السفر",
] as const;

export type AnonymizationEntityLabel =
  (typeof ANONYMIZATION_ENTITY_LABELS)[number];

export const FALLBACK_ANONYMIZATION_ENTITY_LABEL: AnonymizationEntityLabel =
  ANONYMIZATION_ENTITY_LABELS[ANONYMIZATION_ENTITY_LABELS.length - 1];
export const DEFAULT_ANONYMIZATION_ENTITY_LABEL: AnonymizationEntityLabel =
  ANONYMIZATION_ENTITY_LABELS[0];

export function coerceEntityLabel(value: unknown): AnonymizationEntityLabel {
  if (typeof value !== "string") {
    return FALLBACK_ANONYMIZATION_ENTITY_LABEL;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return FALLBACK_ANONYMIZATION_ENTITY_LABEL;
  }
  return ANONYMIZATION_ENTITY_LABELS.includes(
    trimmed as AnonymizationEntityLabel,
  )
    ? (trimmed as AnonymizationEntityLabel)
    : FALLBACK_ANONYMIZATION_ENTITY_LABEL;
}

export function sortEntitySpans(
  spans: readonly OverlayEntitySpan[],
): OverlayEntitySpan[] {
  return [...spans].sort(
    (left, right) =>
      left.start - right.start ||
      left.end - right.end ||
      left.entity.localeCompare(right.entity),
  );
}

export function hasEntityOverlap(
  spans: readonly OverlayEntitySpan[],
  nextStart: number,
  nextEnd: number,
  ignoreIndex?: number,
): boolean {
  return spans.some((span, index) => {
    if (ignoreIndex !== undefined && index === ignoreIndex) {
      return false;
    }
    return nextStart < span.end && nextEnd > span.start;
  });
}

export function normalizeEntitySpansForText(
  spansValue: readonly OverlayEntitySpan[] | unknown,
  text: string,
): OverlayEntitySpan[] {
  if (!Array.isArray(spansValue)) {
    return [];
  }

  const textLength = text.length;
  const candidateSpans: OverlayEntitySpan[] = [];
  for (const value of spansValue) {
    if (typeof value !== "object" || value === null) {
      continue;
    }

    const span = value as Partial<OverlayEntitySpan>;
    const start = Number(span.start);
    const end = Number(span.end);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end > textLength ||
      start >= end
    ) {
      continue;
    }

    candidateSpans.push({
      start,
      end,
      entity: coerceEntityLabel(span.entity),
    });
  }

  const normalized: OverlayEntitySpan[] = [];
  for (const span of sortEntitySpans(candidateSpans)) {
    if (hasEntityOverlap(normalized, span.start, span.end)) {
      continue;
    }
    normalized.push(span);
  }

  return normalized;
}

export function buildEntityPalette(entity: string): {
  background: string;
  text: string;
  border: string;
} {
  const safeEntity = coerceEntityLabel(entity);
  let hash = 0;
  for (let index = 0; index < safeEntity.length; index += 1) {
    hash = (hash * 33 + safeEntity.charCodeAt(index)) >>> 0;
  }
  const hue = hash % 360;
  return {
    background: `hsl(${hue} 85% 64% / 0.35)`,
    text: `hsl(${hue} 70% 86%)`,
    border: `hsl(${hue} 85% 58% / 0.95)`,
  };
}
