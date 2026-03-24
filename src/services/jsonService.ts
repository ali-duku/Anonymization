import type { JsonErrorDetails, JsonGenerationResult } from "../types/json";
import type { JsonService } from "../types/services";
import { writeTextToClipboard } from "../utils/clipboard";

/**
 * Parse and re-serialize JSON losslessly using readable pretty output.
 */
export class BrowserJsonService implements JsonService {
  generate(rawJson: string): JsonGenerationResult {
    const normalized = rawJson.trim();
    if (!normalized) {
      return {
        success: false,
        formattedJson: "",
        error: {
          message: "Input JSON is empty."
        }
      };
    }

    try {
      const parsed = JSON.parse(normalized);
      return {
        success: true,
        formattedJson: JSON.stringify(parsed, null, 2)
      };
    } catch (error) {
      const details = this.parseJsonError(normalized, error);
      return {
        success: false,
        formattedJson: "",
        error: details
      };
    }
  }

  async copyToClipboard(text: string): Promise<boolean> {
    return writeTextToClipboard(text);
  }

  private parseJsonError(rawJson: string, error: unknown): JsonErrorDetails {
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
}

export const jsonService = new BrowserJsonService();
