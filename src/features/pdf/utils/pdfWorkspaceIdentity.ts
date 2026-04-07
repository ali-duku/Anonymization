import type { RetrievedPdfMeta } from "../../../types/pdfRetrieval";

function encodeIdentityPart(value: string): string {
  return encodeURIComponent(value);
}

function normalizeIdentityPart(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "unknown";
  }
  return "unknown";
}

function bytesToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let output = "";
  for (const value of bytes) {
    output += value.toString(16).padStart(2, "0");
  }
  return output;
}

export function buildRetrievedPdfIdentityKey(
  meta: Pick<RetrievedPdfMeta, "id" | "bucketKey" | "updatedAt" | "fileSize">
): string {
  const id = normalizeIdentityPart(meta.id);
  const bucketKey = normalizeIdentityPart(meta.bucketKey);
  const updatedAt = normalizeIdentityPart(meta.updatedAt);
  const fileSize = normalizeIdentityPart(meta.fileSize);
  return [
    "retrieval",
    `id=${encodeIdentityPart(id)}`,
    `bucket=${encodeIdentityPart(bucketKey)}`,
    `updatedAt=${encodeIdentityPart(updatedAt)}`,
    `size=${encodeIdentityPart(fileSize)}`
  ].join("|");
}

export function buildManualPdfIdentityKeyFromHash(hashHex: string): string {
  const normalizedHash = normalizeIdentityPart(hashHex).toLowerCase();
  return `manual|sha256=${encodeIdentityPart(normalizedHash)}`;
}

export function buildManualPdfIdentityKeyFallback(file: File): string {
  return [
    "manual",
    `name=${encodeIdentityPart(normalizeIdentityPart(file.name))}`,
    `size=${encodeIdentityPart(normalizeIdentityPart(file.size))}`,
    `lastModified=${encodeIdentityPart(normalizeIdentityPart(file.lastModified))}`,
    `type=${encodeIdentityPart(normalizeIdentityPart(file.type || "application/pdf"))}`
  ].join("|");
}

export async function computePdfContentHash(blob: Blob): Promise<string> {
  const subtleCrypto = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (!subtleCrypto || typeof subtleCrypto.digest !== "function") {
    throw new Error("SubtleCrypto SHA-256 is unavailable.");
  }

  const bytes = await blob.arrayBuffer();
  const digest = await subtleCrypto.digest("SHA-256", bytes);
  return bytesToHex(digest);
}
