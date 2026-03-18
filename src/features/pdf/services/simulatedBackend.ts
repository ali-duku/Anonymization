import { DEFAULT_RETRIEVAL_TIMEOUT_MS } from "../../../constants/pdfRetrieval";

interface SimulatedBucketRecord {
  id: string;
  fileName: string;
  bucketKey: string;
  contentType: string;
  updatedAt: string;
  assetUrl: string;
}

interface SimulatedSuccessResponse {
  ok: true;
  status: 200;
  data: {
    id: string;
    fileName: string;
    bucketKey: string;
    contentType: string;
    updatedAt: string;
    pdfBlob: Blob;
  };
}

interface SimulatedErrorResponse {
  ok: false;
  status: number;
  error: {
    code: string;
    message: string;
  };
}

const RECORDS_BY_ID: Record<string, SimulatedBucketRecord> = {
  "123456": {
    id: "123456",
    fileName: "المذكرة الشارحة-.pdf",
    bucketKey: "moj-shour_human-poc\\المذكرة الشارحة-.pdf",
    contentType: "application/pdf",
    updatedAt: "2026-03-12T15:05:34.000Z",
    assetUrl: new URL("../../../../moj-shour_human-poc/المذكرة الشارحة-.pdf", import.meta.url).href
  }
};

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException
      ? error.name === "AbortError"
      : typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError"
  );
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Request aborted", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Request aborted", "AbortError"));
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function buildError(status: number, code: string, message: string): SimulatedErrorResponse {
  return {
    ok: false,
    status,
    error: {
      code,
      message
    }
  };
}

function parseRequestUrl(requestUrl: string): URL {
  return new URL(requestUrl, "http://localhost");
}

export async function simulateGetFileEndpoint(
  requestUrl: string,
  signal?: AbortSignal
): Promise<unknown> {
  await sleepWithAbort(DEFAULT_RETRIEVAL_TIMEOUT_MS, signal);

  const url = parseRequestUrl(requestUrl);
  if (url.pathname !== "/api/getfile") {
    return buildError(404, "NOT_FOUND", "Endpoint not found.");
  }

  const id = url.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return buildError(400, "BAD_REQUEST", "Missing required query parameter `id`.");
  }

  if (id === "401") {
    return buildError(401, "UNAUTHORIZED", "User is not authorized to access this file.");
  }

  if (id === "403") {
    return buildError(403, "FORBIDDEN", "Access to this file is forbidden.");
  }

  if (id === "500") {
    return buildError(500, "UNKNOWN_ERROR", "Backend failed while retrieving this file.");
  }

  if (id === "422") {
    return {
      ok: true,
      status: 200,
      data: {
        id,
        fileName: "invalid-payload.pdf",
        bucketKey: "invalid\\invalid-payload.pdf",
        contentType: "application/pdf",
        updatedAt: new Date().toISOString(),
        pdfBlob: new Blob(["not-a-real-pdf"], { type: "application/pdf" })
      }
    };
  }

  if (id === "502") {
    // Intentionally malformed to exercise response guard handling.
    return {
      ok: true,
      status: 200,
      data: {
        id,
        fileName: 123
      }
    };
  }

  const record = RECORDS_BY_ID[id];
  if (!record) {
    return buildError(404, "NOT_FOUND", "No file is mapped to this identifier.");
  }

  try {
    const response = await fetch(record.assetUrl, { signal });
    if (!response.ok) {
      return buildError(500, "UNKNOWN_ERROR", "Could not read file bytes from the secure bucket.");
    }

    const pdfBlob = await response.blob();
    const successResponse: SimulatedSuccessResponse = {
      ok: true,
      status: 200,
      data: {
        id: record.id,
        fileName: record.fileName,
        bucketKey: record.bucketKey,
        contentType: record.contentType,
        updatedAt: record.updatedAt,
        pdfBlob
      }
    };
    return successResponse;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return buildError(500, "UNKNOWN_ERROR", "Bucket fetch failed due to a backend/network problem.");
  }
}
