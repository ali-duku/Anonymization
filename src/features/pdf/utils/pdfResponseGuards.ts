import type {
  GetFileErrorResponse,
  GetFileResponse,
  GetFileSuccessResponse,
  PdfRetrievalErrorCode
} from "../../../types/pdfRetrieval";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapStatusToErrorCode(status: number): PdfRetrievalErrorCode {
  if (status === 400) {
    return "BAD_REQUEST";
  }
  if (status === 401) {
    return "UNAUTHORIZED";
  }
  if (status === 403) {
    return "FORBIDDEN";
  }
  if (status === 404) {
    return "NOT_FOUND";
  }
  return "UNKNOWN_ERROR";
}

function buildMalformedResponseError(requestUrl: string, message: string): GetFileErrorResponse {
  return {
    ok: false,
    status: 502,
    requestUrl,
    error: {
      code: "MALFORMED_RESPONSE",
      message
    }
  };
}

export function coerceGetFileResponse(raw: unknown, requestUrl: string): GetFileResponse {
  if (!isRecord(raw)) {
    return buildMalformedResponseError(requestUrl, "Backend returned a non-object response.");
  }

  const ok = raw.ok;
  const status = raw.status;
  if (typeof ok !== "boolean" || typeof status !== "number") {
    return buildMalformedResponseError(requestUrl, "Backend response is missing `ok` or `status`.");
  }

  if (!ok) {
    const rawError = isRecord(raw.error) ? raw.error : {};
    const codeFromResponse = rawError.code;
    const messageFromResponse = rawError.message;
    const code: PdfRetrievalErrorCode =
      typeof codeFromResponse === "string"
        ? ([
            "VALIDATION_ERROR",
            "BAD_REQUEST",
            "UNAUTHORIZED",
            "FORBIDDEN",
            "NOT_FOUND",
            "MALFORMED_RESPONSE",
            "INVALID_PDF_PAYLOAD",
            "NETWORK_ERROR",
            "ABORTED",
            "UNKNOWN_ERROR"
          ] as const).includes(codeFromResponse as PdfRetrievalErrorCode)
          ? (codeFromResponse as PdfRetrievalErrorCode)
          : mapStatusToErrorCode(status)
        : mapStatusToErrorCode(status);

    return {
      ok: false,
      status,
      requestUrl,
      error: {
        code,
        message:
          typeof messageFromResponse === "string" && messageFromResponse.trim()
            ? messageFromResponse
            : "The backend could not return a file for this request."
      }
    };
  }

  const rawData = raw.data;
  if (!isRecord(rawData)) {
    return buildMalformedResponseError(requestUrl, "Backend success payload is missing `data`.");
  }

  const { id, fileName, bucketKey, contentType, updatedAt, pdfBlob } = rawData;

  if (
    typeof id !== "string" ||
    typeof fileName !== "string" ||
    typeof bucketKey !== "string" ||
    typeof contentType !== "string" ||
    typeof updatedAt !== "string" ||
    !(pdfBlob instanceof Blob)
  ) {
    return buildMalformedResponseError(
      requestUrl,
      "Backend success payload does not match the expected contract."
    );
  }

  const response: GetFileSuccessResponse = {
    ok: true,
    status: 200,
    requestUrl,
    data: {
      id,
      fileName,
      bucketKey,
      contentType,
      updatedAt,
      pdfBlob
    }
  };
  return response;
}

export async function validatePdfPayload(blob: Blob, contentType: string): Promise<string | null> {
  if (blob.size <= 5) {
    return "The retrieved file payload is empty or truncated.";
  }

  const normalizedType = contentType.trim().toLowerCase();
  if (!normalizedType.startsWith("application/pdf")) {
    return "The backend payload is not declared as a PDF.";
  }

  const signatureBytes = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const isPdfSignature =
    signatureBytes.length === 5 &&
    signatureBytes[0] === 0x25 &&
    signatureBytes[1] === 0x50 &&
    signatureBytes[2] === 0x44 &&
    signatureBytes[3] === 0x46 &&
    signatureBytes[4] === 0x2d;

  if (!isPdfSignature) {
    return "The backend payload failed PDF signature validation.";
  }

  return null;
}
