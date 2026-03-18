import type {
  AnnotationService,
  JsonService,
  PdfRetrievalService
} from "../../types/services";

export interface AppPageProps {
  services?: {
    pdfRetrievalService?: PdfRetrievalService;
    jsonService?: JsonService;
    annotationService?: AnnotationService;
  };
}
