export type PdfRetrievalErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "MALFORMED_RESPONSE"
  | "INVALID_PDF_PAYLOAD"
  | "NETWORK_ERROR"
  | "ABORTED"
  | "UNKNOWN_ERROR";

export interface GetFileRequest {
  id: string;
}

export interface GetFileSuccessData {
  id: string;
  fileName: string;
  bucketKey: string;
  contentType: string;
  updatedAt: string;
  pdfBlob: Blob;
}

export interface GetFileSuccessResponse {
  ok: true;
  status: 200;
  requestUrl: string;
  data: GetFileSuccessData;
}

export interface GetFileErrorResponse {
  ok: false;
  status: number;
  requestUrl: string;
  error: {
    code: PdfRetrievalErrorCode;
    message: string;
  };
}

export type GetFileResponse = GetFileSuccessResponse | GetFileErrorResponse;

export interface RetrievedPdfMeta {
  id: string;
  fileName: string;
  bucketKey: string;
  contentType: string;
  fileSize: number;
  updatedAt: string;
  requestUrl: string;
  retrievedAt: string;
}

export interface RetrievedPdfDocument {
  blob: Blob;
  meta: RetrievedPdfMeta;
}
