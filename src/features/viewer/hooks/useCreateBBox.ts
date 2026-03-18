import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { NormalizedBbox, OverlayDocument, OverlayRegion } from "../../../types/overlay";
import { addRegionToDocument, buildNextRegionId } from "../utils/overlayDocument";
import { getNormalizedPointer } from "../utils/pointer";
import {
  computeNormalizedMinimumSize,
  isBboxLargeEnough,
  resolveCreateBbox,
  type NormalizedMinimumSize,
  type NormalizedPoint
} from "../utils/viewerGeometry";

interface CreateInteractionState {
  pointerId: number;
  pageNumber: number;
  startPointer: NormalizedPoint;
  minimumSize: NormalizedMinimumSize;
}

export interface CreateDraftState {
  pageNumber: number;
  bbox: NormalizedBbox;
}

interface UseCreateBBoxOptions {
  pageStageRef: RefObject<HTMLDivElement | null>;
  currentPage: number;
  pageWidth: number;
  pageHeight: number;
  pdfDoc: PDFDocumentProxy | null;
  overlayDocument: OverlayDocument | null;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}

export function useCreateBBox({
  pageStageRef,
  currentPage,
  pageWidth,
  pageHeight,
  pdfDoc,
  overlayDocument,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: UseCreateBBoxOptions) {
  const createDraftRef = useRef<CreateDraftState | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createInteraction, setCreateInteraction] = useState<CreateInteractionState | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraftState | null>(null);

  useEffect(() => {
    createDraftRef.current = createDraft;
  }, [createDraft]);

  const beginCreateBBox = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isCreateMode || !overlayDocument || pageWidth <= 0 || pageHeight <= 0 || !pdfDoc) {
        return;
      }

      const startPointer = getNormalizedPointer(pageStageRef.current, event.clientX, event.clientY);
      if (!startPointer) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);

      const minimumSize = computeNormalizedMinimumSize(pageWidth, pageHeight, 10);
      const nextBbox = resolveCreateBbox(startPointer, startPointer);
      setCreateInteraction({
        pointerId: event.pointerId,
        pageNumber: currentPage,
        startPointer,
        minimumSize
      });
      setCreateDraft({
        pageNumber: currentPage,
        bbox: nextBbox
      });
    },
    [currentPage, isCreateMode, overlayDocument, pageHeight, pageStageRef, pageWidth, pdfDoc]
  );

  useEffect(() => {
    if (!createInteraction) {
      return;
    }

    const handleCreatePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== createInteraction.pointerId) {
        return;
      }

      const pointer = getNormalizedPointer(pageStageRef.current, event.clientX, event.clientY);
      if (!pointer) {
        return;
      }

      const nextBbox = resolveCreateBbox(createInteraction.startPointer, pointer);
      setCreateDraft({
        pageNumber: createInteraction.pageNumber,
        bbox: nextBbox
      });
    };

    const handleCreatePointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== createInteraction.pointerId) {
        return;
      }

      const draftBbox =
        createDraftRef.current?.pageNumber === createInteraction.pageNumber
          ? createDraftRef.current.bbox
          : resolveCreateBbox(createInteraction.startPointer, createInteraction.startPointer);

      const isValidBbox =
        draftBbox.x2 > draftBbox.x1 &&
        draftBbox.y2 > draftBbox.y1 &&
        isBboxLargeEnough(draftBbox, createInteraction.minimumSize);

      if (isValidBbox && overlayDocument && onOverlayDocumentSaved) {
        const nextRegion: OverlayRegion = {
          id: buildNextRegionId(overlayDocument, createInteraction.pageNumber),
          pageNumber: createInteraction.pageNumber,
          label: "Text",
          bbox: draftBbox,
          matchedContent: false,
          text: "",
          entities: [],
          metadata: {
            pageNumber: Math.max(0, createInteraction.pageNumber - 1),
            regionId: null
          },
          layoutSource: null,
          contentSource: null
        };

        onOverlayEditStarted?.();
        onOverlayDocumentSaved(addRegionToDocument(overlayDocument, createInteraction.pageNumber, nextRegion));
        setIsCreateMode(false);
      }

      setCreateInteraction(null);
      setCreateDraft(null);
      createDraftRef.current = null;
    };

    window.addEventListener("pointermove", handleCreatePointerMove);
    window.addEventListener("pointerup", handleCreatePointerEnd);
    window.addEventListener("pointercancel", handleCreatePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handleCreatePointerMove);
      window.removeEventListener("pointerup", handleCreatePointerEnd);
      window.removeEventListener("pointercancel", handleCreatePointerEnd);
    };
  }, [createInteraction, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument, pageStageRef]);

  const resetCreateState = useCallback(() => {
    setCreateInteraction(null);
    setCreateDraft(null);
    createDraftRef.current = null;
  }, []);

  const toggleCreateMode = useCallback(() => {
    setIsCreateMode((previous) => {
      const next = !previous;
      if (!next) {
        resetCreateState();
      }
      return next;
    });
  }, [resetCreateState]);

  return {
    isCreateMode,
    createInteraction,
    createDraft,
    beginCreateBBox,
    setIsCreateMode,
    toggleCreateMode,
    resetCreateState
  };
}
