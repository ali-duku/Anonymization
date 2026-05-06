import type { OverlayEntitySpan } from "../types/overlay";
import {
  FALLBACK_CANONICAL_ENTITY_PALETTE,
  buildCanonicalEntityColorPalette
} from "./entityColors";

interface EntityProfileCatalogEntry {
  id: string;
  displayName: string;
  entityLabels: readonly string[];
}

const MOJ_SHOUR_HUMAN_POC_ENTITY_LABELS = [
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
  "صورة جواز السفر"
] as const;

const MOJ_SHOUR_HUMAN_POC_ORIGINAL_ENTITY_LABELS = [
  "المدّعى عليه",
  "المدّعي",
  "المحامي",
  "الرقم الشخصي للمدعي",
  "رقم الجوال للمدعي",
  "رقم وظيفي للمدعي",
  "موظفين من الجهة المدعى عليها",
  "رقم المؤسسة للمدعى عليها",
  "رقم حساب المدعي",
  "البريد الإلكتروني للمدعية",
  "عنوان المدعي",
  "البريد الإلكتروني للمحامي",
  "عنوان المحامي",
  "رقم هاتف المحامي",
  "رقم منشأة المحامي",
  "رقم هاتف المدعى عليه",
  "البريد الإلكتروني للمدعى عليه",
  "عنوان المدعى عليه",
  "رقم منشأة المدعى عليه",
  "الرقم الشخصي للمحامي",
  "كاتب العدل",
  "موظف حكومي",
  "القاضي (1)",
  "القاضي (2)",
  "برئاسة القاضي",
  "أمين سر الدائرة",
  "موظف قضايا الدولة",
  "تاريخ ميلاد المدّعي",
  "رقم جواز سفر المُدّعي",
  "محامي قضايا دولة",
  "توقيع محامي قضايا الدولة",
  "توقيع المدعي",
  "صورة المدعي",
  "جهة حكومية"
] as const;

const HMC_ANONYMISATION_HANDOFF_ENTITY_LABELS = [
  "Patient Name",
  "Qatar ID",
  "HC Number",
  "Fin",
  "Physician ID",
  "Physician Name",
  "Phone Number"
] as const;

const DUE_DILIGENCE_ENTITY_LABELS = [
  "Client Identity",
  "Location/Address",
  "Contact Information",
  "Website Information",
  "Entity Tax ID",
  "Ticker",
  "Individual Name",
  "Mail Address",
  "Email Address",
  "Telephone Number",
  "Govt/Personal ID"
] as const;

const ENTITY_PROFILE_CATALOG = [
  {
    id: "moj-shour_human-poc",
    displayName: "MoJ Shour Human Review",
    entityLabels: MOJ_SHOUR_HUMAN_POC_ENTITY_LABELS
  },
  {
    id: "moj-shour_human-poc-original",
    displayName: "MoJ Shour Human Review (Original)",
    entityLabels: MOJ_SHOUR_HUMAN_POC_ORIGINAL_ENTITY_LABELS
  },
  {
    id: "HMC_anonymisation_handoff",
    displayName: "HMC Anonymisation Handoff",
    entityLabels: HMC_ANONYMISATION_HANDOFF_ENTITY_LABELS
  },
  {
    id: "due-diligence",
    displayName: "Due Diligence",
    entityLabels: DUE_DILIGENCE_ENTITY_LABELS
  }
] as const satisfies readonly EntityProfileCatalogEntry[];

export type EntityProfileId = (typeof ENTITY_PROFILE_CATALOG)[number]["id"];

interface EntityProfileConfig {
  id: EntityProfileId;
  displayName: string;
  entityLabels: readonly string[];
}

function buildEntityProfiles(
  catalog: readonly (EntityProfileConfig & { readonly id: EntityProfileId })[]
): Record<EntityProfileId, EntityProfileConfig> {
  const profilesById = {} as Record<EntityProfileId, EntityProfileConfig>;
  for (const profile of catalog) {
    profilesById[profile.id] = profile;
  }
  return profilesById;
}

export const ENTITY_PROFILES: Record<EntityProfileId, EntityProfileConfig> =
  buildEntityProfiles(ENTITY_PROFILE_CATALOG);

export const ENTITY_PROFILE_OPTIONS = ENTITY_PROFILE_CATALOG.map((profile) => ({
  id: profile.id,
  displayName: profile.displayName
}));

export const DEFAULT_ENTITY_PROFILE_ID: EntityProfileId = "moj-shour_human-poc";

const FALLBACK_ENTITY_LABEL = "???";

const LEGACY_COLOR_BASE_ENTITY_LABELS = [
  ...MOJ_SHOUR_HUMAN_POC_ENTITY_LABELS,
  ...MOJ_SHOUR_HUMAN_POC_ORIGINAL_ENTITY_LABELS,
  ...HMC_ANONYMISATION_HANDOFF_ENTITY_LABELS
] as const;

export const ALL_ANONYMIZATION_ENTITY_LABELS: readonly string[] = ENTITY_PROFILE_CATALOG.flatMap(
  (profile) => profile.entityLabels
);

type CatalogEntityLabel = (typeof ENTITY_PROFILE_CATALOG)[number]["entityLabels"][number];

export type AnonymizationEntityLabel = CatalogEntityLabel | typeof FALLBACK_ENTITY_LABEL;

export const ANONYMIZATION_ENTITY_LABELS = ENTITY_PROFILES[DEFAULT_ENTITY_PROFILE_ID].entityLabels;

export const FALLBACK_ANONYMIZATION_ENTITY_LABEL: AnonymizationEntityLabel = FALLBACK_ENTITY_LABEL;

export const DEFAULT_ANONYMIZATION_ENTITY_LABEL: string =
  ENTITY_PROFILES[DEFAULT_ENTITY_PROFILE_ID].entityLabels[0] ?? FALLBACK_ANONYMIZATION_ENTITY_LABEL;

export function getAnonymizationEntityLabels(profileId: EntityProfileId): readonly string[] {
  return ENTITY_PROFILES[profileId].entityLabels;
}

export function getDefaultAnonymizationEntityLabel(profileId: EntityProfileId): string {
  return ENTITY_PROFILES[profileId].entityLabels[0] ?? FALLBACK_ANONYMIZATION_ENTITY_LABEL;
}

function compareCanonicalEntityKeys(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function buildCanonicalEntityColorIndices(
  legacyBaseLabels: readonly string[],
  allLabels: readonly string[]
): ReadonlyMap<string, number> {
  const colorIndexByLabel = new Map<string, number>();
  const legacySortedUniqueLabels = Array.from(
    new Set(legacyBaseLabels.map((label) => label.trim()).filter(Boolean))
  );
  legacySortedUniqueLabels.sort(compareCanonicalEntityKeys);
  legacySortedUniqueLabels.forEach((label, index) => {
    colorIndexByLabel.set(label, index);
  });

  let nextIndex = legacySortedUniqueLabels.length;
  for (const label of allLabels.map((value) => value.trim()).filter(Boolean)) {
    if (colorIndexByLabel.has(label)) {
      continue;
    }
    colorIndexByLabel.set(label, nextIndex);
    nextIndex += 1;
  }

  return colorIndexByLabel;
}

const CANONICAL_ENTITY_COLOR_INDEX_BY_LABEL = buildCanonicalEntityColorIndices(
  LEGACY_COLOR_BASE_ENTITY_LABELS,
  ALL_ANONYMIZATION_ENTITY_LABELS
);

function buildProfileLocalColorIndices(
  profileLabels: readonly string[]
): ReadonlyMap<string, number> {
  const colorIndexByLabel = new Map<string, number>();
  for (const label of profileLabels.map((value) => value.trim()).filter(Boolean)) {
    if (colorIndexByLabel.has(label)) {
      continue;
    }
    colorIndexByLabel.set(label, colorIndexByLabel.size);
  }
  return colorIndexByLabel;
}

const DUE_DILIGENCE_ENTITY_COLOR_INDEX_BY_LABEL = buildProfileLocalColorIndices(
  DUE_DILIGENCE_ENTITY_LABELS
);

function isExactCatalogMatch(
  catalog: readonly string[],
  expectedCatalog: readonly string[]
): boolean {
  if (catalog.length !== expectedCatalog.length) {
    return false;
  }
  for (let index = 0; index < expectedCatalog.length; index += 1) {
    if (catalog[index] !== expectedCatalog[index]) {
      return false;
    }
  }
  return true;
}

function isDueDiligenceCatalog(catalog?: readonly string[]): boolean {
  if (!catalog || catalog.length === 0) {
    return false;
  }
  return isExactCatalogMatch(catalog, DUE_DILIGENCE_ENTITY_LABELS);
}

function resolveCatalog(catalog?: readonly string[]): readonly string[] {
  if (!catalog || catalog.length === 0) {
    return ALL_ANONYMIZATION_ENTITY_LABELS;
  }
  return catalog;
}

export function coerceEntityLabel(value: unknown, catalog?: readonly string[]): string {
  if (typeof value !== "string") {
    return FALLBACK_ANONYMIZATION_ENTITY_LABEL;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return FALLBACK_ANONYMIZATION_ENTITY_LABEL;
  }

  const labels = resolveCatalog(catalog);
  return labels.includes(trimmed) ? trimmed : FALLBACK_ANONYMIZATION_ENTITY_LABEL;
}

export function sortEntitySpans(
  spans: readonly OverlayEntitySpan[]
): OverlayEntitySpan[] {
  return [...spans].sort(
    (left, right) =>
      left.start - right.start ||
      left.end - right.end ||
      left.entity.localeCompare(right.entity)
  );
}

export function hasEntityOverlap(
  spans: readonly OverlayEntitySpan[],
  nextStart: number,
  nextEnd: number,
  ignoreIndex?: number
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
  catalog?: readonly string[]
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
      entity: coerceEntityLabel(span.entity, catalog)
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

export function buildEntityPalette(entity: string, catalog?: readonly string[]): {
  background: string;
  text: string;
  border: string;
} {
  const safeEntity = isDueDiligenceCatalog(catalog)
    ? coerceEntityLabel(entity, DUE_DILIGENCE_ENTITY_LABELS)
    : coerceEntityLabel(entity);
  if (safeEntity === FALLBACK_ANONYMIZATION_ENTITY_LABEL) {
    return {
      background: FALLBACK_CANONICAL_ENTITY_PALETTE.chipBackground,
      text: FALLBACK_CANONICAL_ENTITY_PALETTE.chipText,
      border: FALLBACK_CANONICAL_ENTITY_PALETTE.border
    };
  }

  const colorIndex = isDueDiligenceCatalog(catalog)
    ? DUE_DILIGENCE_ENTITY_COLOR_INDEX_BY_LABEL.get(safeEntity)
    : CANONICAL_ENTITY_COLOR_INDEX_BY_LABEL.get(safeEntity);
  if (colorIndex === undefined) {
    return {
      background: FALLBACK_CANONICAL_ENTITY_PALETTE.chipBackground,
      text: FALLBACK_CANONICAL_ENTITY_PALETTE.chipText,
      border: FALLBACK_CANONICAL_ENTITY_PALETTE.border
    };
  }

  const palette = buildCanonicalEntityColorPalette(colorIndex);
  return {
    background: palette.chipBackground,
    text: palette.chipText,
    border: palette.border
  };
}
