import { GET_FILE_ENDPOINT } from "../../../constants/pdfRetrieval";
import type { GetFileRequest } from "../../../types/pdfRetrieval";
import { simulateGetFileEndpoint } from "./simulatedBackend";

export function buildGetFileUrl(request: GetFileRequest): string {
  const queryParams = new URLSearchParams({ id: request.id });
  return `${GET_FILE_ENDPOINT}?${queryParams.toString()}`;
}

export async function requestGetFile(requestUrl: string, signal?: AbortSignal): Promise<unknown> {
  return simulateGetFileEndpoint(requestUrl, signal);
}
