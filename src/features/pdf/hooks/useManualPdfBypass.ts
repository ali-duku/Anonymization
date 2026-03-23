import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type MutableRefObject
} from "react";
import type { RetrievedPdfDocument, RetrievedPdfMeta } from "../../../types/pdfRetrieval";

export type ManualPdfBypassStatus = "idle" | "success" | "error";

interface UseManualPdfBypassOptions {
  onDocumentLoaded?: (document: RetrievedPdfDocument) => void;
  onDocumentCleared?: () => void;
}

interface ManualPdfBypassState {
  status: ManualPdfBypassStatus;
  errorMessage: string | null;
  document: RetrievedPdfDocument | null;
}

interface ManualPdfBypassActions {
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  handleFilePick: () => void;
  handleFileChange: ChangeEventHandler<HTMLInputElement>;
  resetManualDocument: () => void;
}

function isPdfFile(file: File): boolean {
  return file.type.toLowerCase().startsWith("application/pdf") || file.name.toLowerCase().endsWith(".pdf");
}

function buildManualMeta(file: File): RetrievedPdfMeta {
  const now = new Date().toISOString();

  return {
    id: `manual-${Date.now()}`,
    fileName: file.name || "manual-upload.pdf",
    bucketKey: `local/${file.name || "manual-upload.pdf"}`,
    contentType: file.type || "application/pdf",
    fileSize: file.size,
    updatedAt: now,
    requestUrl: "manual://local-upload",
    retrievedAt: now
  };
}

export function useManualPdfBypass({
  onDocumentLoaded,
  onDocumentCleared
}: UseManualPdfBypassOptions = {}): ManualPdfBypassState & ManualPdfBypassActions {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<ManualPdfBypassState>({
    status: "idle",
    errorMessage: null,
    document: null
  });

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!isPdfFile(file)) {
        setState((previous) => ({
          ...previous,
          status: "error",
          errorMessage: "Only PDF files are supported for manual upload."
        }));
        event.currentTarget.value = "";
        return;
      }

      const nextDocument: RetrievedPdfDocument = {
        blob: file,
        meta: buildManualMeta(file)
      };

      setState({
        status: "success",
        errorMessage: null,
        document: nextDocument
      });
      onDocumentLoaded?.(nextDocument);
      event.currentTarget.value = "";
    },
    [onDocumentLoaded]
  );

  const resetManualDocument = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setState({
      status: "idle",
      errorMessage: null,
      document: null
    });
    onDocumentCleared?.();
  }, [onDocumentCleared]);

  return useMemo(
    () => ({
      status: state.status,
      errorMessage: state.errorMessage,
      document: state.document,
      fileInputRef,
      handleFilePick,
      handleFileChange,
      resetManualDocument
    }),
    [handleFileChange, handleFilePick, resetManualDocument, state.document, state.errorMessage, state.status]
  );
}
