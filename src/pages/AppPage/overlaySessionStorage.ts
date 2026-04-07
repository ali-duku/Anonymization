import type { OverlayDocument, OverlayEditSession } from "../../types/overlay";

const OVERLAY_SESSION_STORAGE_KEY = "anonymizer.overlaySessionByPdf.v1";
const OVERLAY_SESSION_STORAGE_VERSION = 1;
const MAX_PERSISTED_OVERLAY_SESSIONS = 20;

interface PersistedOverlaySessionRecord {
  pdfIdentityKey: string;
  document: OverlayDocument;
  sourceJsonRaw: string;
  sourceRoot: Record<string, unknown>;
  hasViewerChanges: boolean;
  lastSavedAt: string | null;
  updatedAt: string;
}

interface PersistedOverlaySessionStore {
  version: number;
  sessions: Record<string, PersistedOverlaySessionRecord>;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isValidBbox(value: unknown): boolean {
  if (!isObjectRecord(value)) {
    return false;
  }
  return (
    isFiniteNumber(value.x1) &&
    isFiniteNumber(value.y1) &&
    isFiniteNumber(value.x2) &&
    isFiniteNumber(value.y2)
  );
}

function isValidEntities(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(
    (entity) =>
      isObjectRecord(entity) &&
      isFiniteNumber(entity.start) &&
      isFiniteNumber(entity.end) &&
      isString(entity.entity)
  );
}

function isValidOverlayDocument(value: unknown): value is OverlayDocument {
  if (!isObjectRecord(value) || !Array.isArray(value.pages)) {
    return false;
  }

  return value.pages.every(
    (page) =>
      isObjectRecord(page) &&
      isFiniteNumber(page.pageNumber) &&
      Array.isArray(page.regions) &&
      page.regions.every(
        (region) =>
          isObjectRecord(region) &&
          isString(region.id) &&
          isFiniteNumber(region.pageNumber) &&
          isString(region.label) &&
          isValidBbox(region.bbox) &&
          isBoolean(region.matchedContent) &&
          isString(region.text) &&
          isValidEntities(region.entities)
      )
  );
}

function sanitizePersistedRecord(value: unknown): PersistedOverlaySessionRecord | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  if (
    !isString(value.pdfIdentityKey) ||
    !isValidOverlayDocument(value.document) ||
    !isString(value.sourceJsonRaw) ||
    !isObjectRecord(value.sourceRoot) ||
    !isBoolean(value.hasViewerChanges) ||
    !(value.lastSavedAt === null || isString(value.lastSavedAt)) ||
    !isString(value.updatedAt)
  ) {
    return null;
  }

  return {
    pdfIdentityKey: value.pdfIdentityKey,
    document: value.document,
    sourceJsonRaw: value.sourceJsonRaw,
    sourceRoot: value.sourceRoot,
    hasViewerChanges: value.hasViewerChanges,
    lastSavedAt: value.lastSavedAt,
    updatedAt: value.updatedAt
  };
}

function readStoreFromStorage(): PersistedOverlaySessionStore {
  if (typeof window === "undefined") {
    return { version: OVERLAY_SESSION_STORAGE_VERSION, sessions: {} };
  }

  try {
    const raw = window.localStorage.getItem(OVERLAY_SESSION_STORAGE_KEY);
    if (!raw) {
      return { version: OVERLAY_SESSION_STORAGE_VERSION, sessions: {} };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isObjectRecord(parsed) || parsed.version !== OVERLAY_SESSION_STORAGE_VERSION) {
      return { version: OVERLAY_SESSION_STORAGE_VERSION, sessions: {} };
    }

    const sessionsRaw = isObjectRecord(parsed.sessions) ? parsed.sessions : {};
    const sessions: Record<string, PersistedOverlaySessionRecord> = {};
    for (const [key, value] of Object.entries(sessionsRaw)) {
      const record = sanitizePersistedRecord(value);
      if (!record) {
        continue;
      }
      sessions[key] = record;
    }

    return { version: OVERLAY_SESSION_STORAGE_VERSION, sessions };
  } catch {
    return { version: OVERLAY_SESSION_STORAGE_VERSION, sessions: {} };
  }
}

function writeStoreToStorage(store: PersistedOverlaySessionStore): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(OVERLAY_SESSION_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage write failures.
  }
}

function pruneSessions(
  sessions: Record<string, PersistedOverlaySessionRecord>
): Record<string, PersistedOverlaySessionRecord> {
  const entries = Object.entries(sessions);
  if (entries.length <= MAX_PERSISTED_OVERLAY_SESSIONS) {
    return sessions;
  }

  entries.sort((left, right) => {
    const leftTime = Date.parse(left[1].updatedAt) || 0;
    const rightTime = Date.parse(right[1].updatedAt) || 0;
    return rightTime - leftTime;
  });

  const trimmed = entries.slice(0, MAX_PERSISTED_OVERLAY_SESSIONS);
  return Object.fromEntries(trimmed);
}

export function loadPersistedOverlaySession(pdfIdentityKey: string): OverlayEditSession | null {
  if (!pdfIdentityKey) {
    return null;
  }

  const store = readStoreFromStorage();
  const record = store.sessions[pdfIdentityKey];
  if (!record) {
    return null;
  }

  return {
    document: record.document,
    sourceJsonRaw: record.sourceJsonRaw,
    sourceRoot: record.sourceRoot,
    hasViewerChanges: record.hasViewerChanges,
    saveState: {
      isSaving: false,
      isSaved: true,
      lastSavedAt: record.lastSavedAt ?? record.updatedAt
    }
  };
}

export function persistOverlaySession(
  pdfIdentityKey: string,
  session: OverlayEditSession
): void {
  if (!pdfIdentityKey) {
    return;
  }

  const store = readStoreFromStorage();
  const updatedAt = new Date().toISOString();
  const nextSessions = {
    ...store.sessions,
    [pdfIdentityKey]: {
      pdfIdentityKey,
      document: session.document,
      sourceJsonRaw: session.sourceJsonRaw,
      sourceRoot: session.sourceRoot,
      hasViewerChanges: session.hasViewerChanges,
      lastSavedAt: session.saveState.lastSavedAt,
      updatedAt
    }
  };

  writeStoreToStorage({
    version: OVERLAY_SESSION_STORAGE_VERSION,
    sessions: pruneSessions(nextSessions)
  });
}

export function removePersistedOverlaySession(pdfIdentityKey: string): void {
  if (!pdfIdentityKey) {
    return;
  }

  const store = readStoreFromStorage();
  if (!store.sessions[pdfIdentityKey]) {
    return;
  }

  const nextSessions = { ...store.sessions };
  delete nextSessions[pdfIdentityKey];

  writeStoreToStorage({
    version: OVERLAY_SESSION_STORAGE_VERSION,
    sessions: nextSessions
  });
}
