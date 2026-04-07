import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PdfRetrievalErrorCode,
  RetrievedPdfDocument,
  RetrievedPdfMeta
} from "../../../types/pdfRetrieval";
import type { PdfRetrievalService } from "../../../types/services";
import { validatePdfIdentifier } from "../utils/pdfIdentifier";
import { buildRetrievedPdfIdentityKey } from "../utils/pdfWorkspaceIdentity";

export type PdfRetrievalStatus = "idle" | "loading" | "success" | "error";

interface PdfRetrievalErrorState {
  code: PdfRetrievalErrorCode;
  message: string;
}

interface UsePdfRetrievalOptions {
  pdfRetrievalService: PdfRetrievalService;
  onDocumentRetrieved?: (document: RetrievedPdfDocument) => void;
  onDocumentCleared?: () => void;
}

export interface PdfRetrievalState {
  status: PdfRetrievalStatus;
  activeRequestId: string | null;
  lastRequestedId: string | null;
  error: PdfRetrievalErrorState | null;
  document: RetrievedPdfDocument | null;
}

const INITIAL_RETRIEVAL_STATE: PdfRetrievalState = {
  status: "idle",
  activeRequestId: null,
  lastRequestedId: null,
  error: null,
  document: null
};

function buildRetrievedMeta(
  requestUrl: string,
  data: {
    id: string;
    fileName: string;
    bucketKey: string;
    contentType: string;
    updatedAt: string;
    pdfBlob: Blob;
  }
): RetrievedPdfMeta {
  const identityKey = buildRetrievedPdfIdentityKey({
    id: data.id,
    bucketKey: data.bucketKey,
    updatedAt: data.updatedAt,
    fileSize: data.pdfBlob.size
  });

  return {
    id: data.id,
    fileName: data.fileName,
    bucketKey: data.bucketKey,
    contentType: data.contentType,
    fileSize: data.pdfBlob.size,
    updatedAt: data.updatedAt,
    requestUrl,
    retrievedAt: new Date().toISOString(),
    identityKey
  };
}

export function usePdfRetrieval({
  pdfRetrievalService,
  onDocumentRetrieved,
  onDocumentCleared
}: UsePdfRetrievalOptions) {
  const [state, setState] = useState<PdfRetrievalState>(INITIAL_RETRIEVAL_STATE);
  const requestSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRequestIdRef = useRef<string | null>(null);

  const requestDocument = useCallback(
    async (rawIdentifier: string) => {
      const validation = validatePdfIdentifier(rawIdentifier);
      if (!validation.ok) {
        setState((previous) => ({
          ...previous,
          status: "error",
          activeRequestId: null,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.message
          }
        }));
        return;
      }

      const safeId = validation.id;
      if (inFlightRequestIdRef.current === safeId) {
        return;
      }

      setState((previous) => ({
        ...previous,
        status: "loading",
        activeRequestId: safeId,
        lastRequestedId: safeId,
        error: null
      }));

      abortControllerRef.current?.abort();
      const nextController = new AbortController();
      abortControllerRef.current = nextController;
      inFlightRequestIdRef.current = safeId;
      const currentSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = currentSequence;

      let response;
      try {
        response = await pdfRetrievalService.getFile(
          { id: safeId },
          { signal: nextController.signal }
        );
      } catch {
        response = {
          ok: false as const,
          status: 503,
          requestUrl: "",
          error: {
            code: "NETWORK_ERROR" as const,
            message: "Network/backend failure while retrieving the file."
          }
        };
      }

      if (currentSequence !== requestSequenceRef.current) {
        return;
      }

      if (!response.ok) {
        if (response.error.code === "ABORTED") {
          inFlightRequestIdRef.current = null;
          setState((previous) => ({
            ...previous,
            status: previous.document ? "success" : "idle",
            activeRequestId: null,
            error: null
          }));
          return;
        }

        inFlightRequestIdRef.current = null;
        setState((previous) => ({
          ...previous,
          status: "error",
          activeRequestId: null,
          error: {
            code: response.error.code,
            message: response.error.message
          }
        }));
        return;
      }

      const document: RetrievedPdfDocument = {
        blob: response.data.pdfBlob,
        meta: buildRetrievedMeta(response.requestUrl, response.data)
      };

      inFlightRequestIdRef.current = null;
      setState({
        status: "success",
        activeRequestId: null,
        lastRequestedId: safeId,
        error: null,
        document
      });
      onDocumentRetrieved?.(document);
    },
    [onDocumentRetrieved, pdfRetrievalService]
  );

  const retryLastRequest = useCallback(() => {
    if (!state.lastRequestedId) {
      return;
    }
    void requestDocument(state.lastRequestedId);
  }, [requestDocument, state.lastRequestedId]);

  const resetRetrieval = useCallback(() => {
    requestSequenceRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    inFlightRequestIdRef.current = null;
    setState(INITIAL_RETRIEVAL_STATE);
    onDocumentCleared?.();
  }, [onDocumentCleared]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    state,
    requestDocument,
    retryLastRequest,
    resetRetrieval
  };
}
