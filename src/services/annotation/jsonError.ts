import type { JsonErrorDetails } from "../../types/json";

export function parseJsonError(rawJson: string, error: unknown): JsonErrorDetails {
  const defaultMessage = "Invalid JSON.";
  if (!(error instanceof Error)) {
    return { message: defaultMessage };
  }

  const match = /position\s+(\d+)/i.exec(error.message);
  if (!match) {
    return { message: error.message || defaultMessage };
  }

  const position = Number(match[1]);
  const beforeError = rawJson.slice(0, Math.max(0, position));
  const line = beforeError.split("\n").length;
  const column = beforeError.length - beforeError.lastIndexOf("\n");

  return {
    message: error.message || defaultMessage,
    position,
    line,
    column
  };
}
