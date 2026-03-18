import type { AnnotationService, JsonService, StorageService } from "../../types/services";

export interface AppPageProps {
  services?: {
    storageService?: StorageService;
    jsonService?: JsonService;
    annotationService?: AnnotationService;
  };
}
