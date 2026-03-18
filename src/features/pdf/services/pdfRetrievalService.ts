import type { GetFileRequest, GetFileResponse } from "../../../types/pdfRetrieval";
import type { PdfRetrievalService } from "../../../types/services";
import { coerceGetFileResponse, validatePdfPayload } from "../utils/pdfResponseGuards";
import { buildGetFileUrl, requestGetFile } from "./pdfRetrievalApi";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError";
}

export class BrowserPdfRetrievalService implements PdfRetrievalService {
  async getFile(
    request: GetFileRequest,
    options?: { signal?: AbortSignal }
  ): Promise<GetFileResponse> {
    const requestUrl = buildGetFileUrl(request);

    try {
      const rawResponse = await requestGetFile(requestUrl, options?.signal);
      const response = coerceGetFileResponse(rawResponse, requestUrl);
      if (!response.ok) {
        return response;
      }

      const invalidPayloadMessage = await validatePdfPayload(
        response.data.pdfBlob,
        response.data.contentType
      );

      if (invalidPayloadMessage) {
        return {
          ok: false,
          status: 422,
          requestUrl,
          error: {
            code: "INVALID_PDF_PAYLOAD",
            message: invalidPayloadMessage
          }
        };
      }

      return response;
    } catch (error) {
      if (isAbortError(error)) {
        return {
          ok: false,
          status: 499,
          requestUrl,
          error: {
            code: "ABORTED",
            message: "Request was canceled."
          }
        };
      }

      return {
        ok: false,
        status: 503,
        requestUrl,
        error: {
          code: "NETWORK_ERROR",
          message: "Network/backend failure while retrieving the file."
        }
      };
    }
  }
}

export const pdfRetrievalService = new BrowserPdfRetrievalService();
