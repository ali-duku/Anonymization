import {
  MAX_PDF_IDENTIFIER_LENGTH,
  MIN_PDF_IDENTIFIER_LENGTH
} from "../../../constants/pdfRetrieval";

export interface PdfIdentifierValidationSuccess {
  ok: true;
  id: string;
}

export interface PdfIdentifierValidationFailure {
  ok: false;
  message: string;
}

export type PdfIdentifierValidationResult =
  | PdfIdentifierValidationSuccess
  | PdfIdentifierValidationFailure;

function normalizeNumericIdentifier(value: string): string {
  return value.replace(/^0+(?=\d)/, "");
}

export function validatePdfIdentifier(rawValue: string): PdfIdentifierValidationResult {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return {
      ok: false,
      message: "Enter a file ID before requesting a document."
    };
  }

  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      message: "Only numeric file IDs are supported."
    };
  }

  if (trimmed.length < MIN_PDF_IDENTIFIER_LENGTH || trimmed.length > MAX_PDF_IDENTIFIER_LENGTH) {
    return {
      ok: false,
      message: `File ID must be ${MIN_PDF_IDENTIFIER_LENGTH}-${MAX_PDF_IDENTIFIER_LENGTH} digits.`
    };
  }

  return {
    ok: true,
    id: normalizeNumericIdentifier(trimmed)
  };
}
