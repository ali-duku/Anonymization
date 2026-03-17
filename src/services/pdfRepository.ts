export interface PdfRecord {
  id: string;
  fileName: string;
  blob: Blob;
}

export interface PdfRepository {
  fetchById(id: string): Promise<PdfRecord>;
}

// Local bundled PDF asset for development/testing.
// NOTE: This is only used in the browser build; tests and Node environments
// do not need to load the actual file.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error Vite `?url` import for static asset
import mojMemoPdfUrl from "../../moj-shour_human-poc/المذكرة الشارحة-.pdf?url";

class InMemoryPdfRepository implements PdfRepository {
  // Simple in-memory registry for local testing.
  // In a real deployment this would be replaced by a backend call that
  // validates the ID and returns a secure URL or PDF bytes.
  async fetchById(id: string): Promise<PdfRecord> {
    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error("Missing document ID.");
    }

    // For local development we construct a tiny synthetic PDF on the fly so
    // the viewer can exercise the full rendering flow without bundling
    // external fixtures.
    if (trimmedId === "DEMO") {
      const pdfBytes = buildMinimalPdf(`Demo document for ID "${trimmedId}"`);
      const blob = new Blob([pdfBytes.buffer], { type: "application/pdf" });
      return {
        id: trimmedId,
        fileName: "demo.pdf",
        blob
      };
    }

    // Real bundled PDF used for local testing of the secure-ID flow.
    // The underlying file lives at `moj-shour_human-poc/المذكرة الشارحة-.pdf`.
    if (trimmedId === "MOJ_MEMO") {
      const response = await fetch(mojMemoPdfUrl);
      if (!response.ok) {
        throw new Error("Failed to download PDF for the provided ID.");
      }
      const blob = await response.blob();
      return {
        id: trimmedId,
        fileName: "المذكرة الشارحة-.pdf",
        blob
      };
    }

    throw new Error("No PDF found for the provided ID.");
  }
}

function buildMinimalPdf(text: string): Uint8Array {
  // Extremely small, static one-page PDF with a text payload. This is not
  // intended for production use and should be replaced by a real backend
  // integration that streams PDF bytes or returns a signed URL.
  //
  // The content stream writes a single text line near the top-left corner.
  const encodedText = encodePdfString(text);
  const contentStream = `BT /F1 12 Tf 72 720 Td (${encodedText}) Tj ET`;
  const contentLength = contentStream.length;

  const parts: string[] = [];
  const xrefPositions: number[] = [];

  const write = (chunk: string) => {
    xrefPositions.push(currentOffset(parts));
    parts.push(chunk);
  };

  parts.push("%PDF-1.4\n");

  // 1: Catalog
  write("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // 2: Pages
  write("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // 3: Page
  write(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );

  // 4: Contents
  write(`4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`);

  // 5: Font
  write("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  const xrefOffset = currentOffset(parts);
  const body = parts.join("");

  const xrefEntries = ["0000000000 65535 f \n"];
  for (const position of xrefPositions) {
    xrefEntries.push(formatXrefEntry(position));
  }

  const trailer = [
    "xref\n",
    `0 ${xrefEntries.length}\n`,
    ...xrefEntries,
    "trailer\n",
    "<< /Size 6 /Root 1 0 R >>\n",
    "startxref\n",
    `${xrefOffset}\n`,
    "%%EOF"
  ].join("");

  const full = body + trailer;
  const bytes = new Uint8Array(full.length);
  for (let index = 0; index < full.length; index += 1) {
    bytes[index] = full.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function currentOffset(parts: string[]): number {
  return parts.reduce((sum, chunk) => sum + chunk.length, 0);
}

function formatXrefEntry(position: number): string {
  const padded = position.toString().padStart(10, "0");
  return `${padded} 00000 n \n`;
}

function encodePdfString(value: string): string {
  // Escape characters that have special meaning in PDF literal strings.
  return value.replace(/([()\\])/g, "\\$1");
}

export const pdfRepository: PdfRepository = new InMemoryPdfRepository();

