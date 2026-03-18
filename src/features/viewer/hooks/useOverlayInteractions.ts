import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from "react";
import type { NormalizedBbox, OverlayDocument, OverlayRegion } from "../../../types/overlay";
import { BBOX_CHANGE_EPSILON } from "../constants/viewerConstants";
import { applyRegionBbox, hasBboxChanged } from "../utils/overlayDocument";
import { getNormalizedPointer } from "../utils/pointer";
import {
  computeNormalizedMinimumSize,
  moveBboxWithinPage,
  resizeBboxWithinPage,
  type NormalizedMinimumSize,
  type NormalizedPoint,
  type ResizeHandle
} from "../utils/viewerGeometry";

export interface OverlayDraftState {
  regionId: string;
  pageNumber: number;
  bbox: NormalizedBbox;
}

type OverlayInteractionMode = "drag" | ResizeHandle;

interface OverlayInteractionState {
  pointerId: number;
  regionId: string;
  pageNumber: number;
  mode: OverlayInteractionMode;
  startPointer: NormalizedPoint;
  startBbox: NormalizedBbox;
  minimumSize: NormalizedMinimumSize;
}

interface UseOverlayInteractionsOptions {
  pageStageRef: RefObject<HTMLDivElement | null>;
  pageWidth: number;
  pageHeight: number;
  isCreateMode: boolean;
  overlayDocument: OverlayDocument | null;
  onOverlayEditStarted?: () => void;
  onOverlayDocumentSaved?: (document: OverlayDocument) => void;
}

function resolveNextBbox(
  interaction: OverlayInteractionState,
  currentPointer: NormalizedPoint
): NormalizedBbox {
  const delta = {
    x: currentPointer.x - interaction.startPointer.x,
    y: currentPointer.y - interaction.startPointer.y
  };

  if (interaction.mode === "drag") {
    return moveBboxWithinPage(interaction.startBbox, delta);
  }

  return resizeBboxWithinPage(
    interaction.startBbox,
    delta,
    interaction.mode,
    interaction.minimumSize
  );
}

export function useOverlayInteractions({
  pageStageRef,
  pageWidth,
  pageHeight,
  isCreateMode,
  overlayDocument,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: UseOverlayInteractionsOptions) {
  const draftRef = useRef<OverlayDraftState | null>(null);
  const [interaction, setInteraction] = useState<OverlayInteractionState | null>(null);
  const [draft, setDraft] = useState<OverlayDraftState | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const beginInteraction = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      region: OverlayRegion,
      mode: OverlayInteractionMode
    ) => {
      if (isCreateMode || !overlayDocument || pageWidth <= 0 || pageHeight <= 0) {
        return;
      }

      const startPointer = getNormalizedPointer(pageStageRef.current, event.clientX, event.clientY);
      if (!startPointer) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);

      setInteraction({
        pointerId: event.pointerId,
        regionId: region.id,
        pageNumber: region.pageNumber,
        mode,
        startPointer,
        startBbox: region.bbox,
        minimumSize: computeNormalizedMinimumSize(pageWidth, pageHeight, 10)
      });

      setDraft({
        regionId: region.id,
        pageNumber: region.pageNumber,
        bbox: region.bbox
      });
    },
    [isCreateMode, overlayDocument, pageHeight, pageStageRef, pageWidth]
  );

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== interaction.pointerId) {
        return;
      }

      const pointer = getNormalizedPointer(pageStageRef.current, event.clientX, event.clientY);
      if (!pointer) {
        return;
      }

      const nextBbox = resolveNextBbox(interaction, pointer);
      setDraft({
        regionId: interaction.regionId,
        pageNumber: interaction.pageNumber,
        bbox: nextBbox
      });
    };

    const handleInteractionEnd = (event: PointerEvent) => {
      if (event.pointerId !== interaction.pointerId) {
        return;
      }

      const nextBbox =
        draftRef.current?.regionId === interaction.regionId
          ? draftRef.current.bbox
          : interaction.startBbox;
      const bboxChanged = hasBboxChanged(interaction.startBbox, nextBbox, BBOX_CHANGE_EPSILON);

      if (bboxChanged && overlayDocument && onOverlayDocumentSaved) {
        onOverlayEditStarted?.();
        const nextDocument = applyRegionBbox(
          overlayDocument,
          interaction.pageNumber,
          interaction.regionId,
          nextBbox
        );
        onOverlayDocumentSaved(nextDocument);
      }

      setInteraction(null);
      setDraft(null);
      draftRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handleInteractionEnd);
    window.addEventListener("pointercancel", handleInteractionEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handleInteractionEnd);
      window.removeEventListener("pointercancel", handleInteractionEnd);
    };
  }, [interaction, onOverlayDocumentSaved, onOverlayEditStarted, overlayDocument, pageStageRef]);

  const resetOverlayInteractionState = useCallback(() => {
    setInteraction(null);
    setDraft(null);
    draftRef.current = null;
  }, []);

  return {
    interaction,
    draft,
    beginInteraction,
    resetOverlayInteractionState
  };
}
