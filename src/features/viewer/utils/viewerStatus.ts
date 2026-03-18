import type { PdfLoadStatus } from "../../../types/pdf";

export function clampZoom(value: number, minZoom: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(minZoom, Number(value.toFixed(2))));
}

export function buildStatusText(loadStatus: PdfLoadStatus, message?: string): string {
  if (loadStatus === "loading") {
    return "Loading PDF...";
  }
  if (loadStatus === "error") {
    return message ?? "Unable to load PDF.";
  }
  return "";
}

export function buildRecordSummary(
  fileName: string,
  fileSize: number,
  updatedAt: string
): string {
  return `${fileName} | ${(fileSize / 1024 / 1024).toFixed(2)} MB | ${new Date(updatedAt).toLocaleString()}`;
}

export function buildSaveIndicatorText(
  isSaving: boolean,
  isSaved: boolean,
  lastSavedAt: string | null
): string {
  if (isSaving) {
    return "Saving...";
  }
  if (isSaved) {
    if (lastSavedAt) {
      return `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`;
    }
    return "Saved";
  }
  return "Unsaved";
}
