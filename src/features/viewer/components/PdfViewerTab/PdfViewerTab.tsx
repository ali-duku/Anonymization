import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import { CREATE_DRAFT_REGION_ID } from "../../constants/viewerConstants";
import { useCreateBBox } from "../../hooks/useCreateBBox";
import { useOverlayInteractions } from "../../hooks/useOverlayInteractions";
import { usePdfDocument } from "../../hooks/usePdfDocument";
import { useRegionEditor } from "../../hooks/useRegionEditor";
import { normalizedBboxToCanvasCrop } from "../../utils/regionSnippet";
import {
  buildRecordSummary,
  buildSaveIndicatorText,
  buildStatusText
} from "../../utils/viewerStatus";
import { RegionEditorModal } from "../RegionEditorModal/RegionEditorModal";
import type { RegionEditorSnippet } from "../RegionEditorModal/RegionEditorModal.types";
import { ViewerCanvasStage } from "../ViewerCanvasStage/ViewerCanvasStage";
import { ViewerStatus } from "../ViewerStatus/ViewerStatus";
import { ViewerToolbar } from "../ViewerToolbar/ViewerToolbar";
import styles from "./PdfViewerTab.module.css";
import type { PdfViewerTabProps } from "./PdfViewerTab.types";

function PdfViewerTabComponent({
  retrievedPdfDocument,
  retrievalInputValue,
  retrievalStatus,
  retrievalErrorMessage,
  canRetryRetrieval,
  onRetrievalInputChange,
  onRetrieveDocument,
  onResetRetrieval,
  onRetryRetrieval,
  overlayDocument = null,
  overlaySaveState = null,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: PdfViewerTabProps) {
  const pdfState = usePdfDocument({ retrievedPdfDocument });
  const lastAutoFitKeyRef = useRef<string | null>(null);
  const [regionSnippet, setRegionSnippet] = useState<RegionEditorSnippet | null>(null);

  const {
    isCreateMode,
    createDraft,
    beginCreateBBox,
    toggleCreateMode,
    resetCreateState,
    setIsCreateMode
  } = useCreateBBox({
    pageStageRef: pdfState.pageStageRef,
    currentPage: pdfState.currentPage,
    pageWidth: pdfState.pageWidth,
    pageHeight: pdfState.pageHeight,
    pdfDoc: pdfState.pdfDoc,
    overlayDocument,
    onOverlayEditStarted,
    onOverlayDocumentSaved
  });

  const {
    interaction,
    draft,
    beginInteraction,
    resetOverlayInteractionState
  } = useOverlayInteractions({
    pageStageRef: pdfState.pageStageRef,
    pageWidth: pdfState.pageWidth,
    pageHeight: pdfState.pageHeight,
    isCreateMode,
    overlayDocument,
    onOverlayEditStarted,
    onOverlayDocumentSaved
  });

  const regionEditor = useRegionEditor({
    overlayDocument,
    currentPage: pdfState.currentPage,
    onOverlayEditStarted,
    onOverlayDocumentSaved
  });

  useEffect(() => {
    resetOverlayInteractionState();
    setIsCreateMode(false);
    resetCreateState();
  }, [overlayDocument, pdfState.currentPage, resetCreateState, resetOverlayInteractionState, setIsCreateMode]);

  useEffect(() => {
    if (!pdfState.hasPdf || !pdfState.documentMeta) {
      lastAutoFitKeyRef.current = null;
      return;
    }

    const nextAutoFitKey = `${pdfState.documentMeta.id}:${pdfState.documentMeta.updatedAt}`;
    if (lastAutoFitKeyRef.current === nextAutoFitKey) {
      return;
    }

    lastAutoFitKeyRef.current = nextAutoFitKey;
    const frame = window.requestAnimationFrame(() => {
      void pdfState.handleFitToWidth();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pdfState.documentMeta, pdfState.handleFitToWidth, pdfState.hasPdf]);

  useEffect(() => {
    const activeRegion = regionEditor.activeRegion;
    if (!activeRegion) {
      setRegionSnippet(null);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const canvas = pdfState.canvasRef.current;
      if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
        setRegionSnippet({
          imageUrl: null,
          width: null,
          height: null
        });
        return;
      }

      const crop = normalizedBboxToCanvasCrop(
        activeRegion.bbox,
        canvas.width,
        canvas.height
      );

      if (!crop) {
        setRegionSnippet({
          imageUrl: null,
          width: null,
          height: null
        });
        return;
      }

      const snippetCanvas = document.createElement("canvas");
      snippetCanvas.width = crop.width;
      snippetCanvas.height = crop.height;
      const snippetContext = snippetCanvas.getContext("2d");
      if (!snippetContext) {
        setRegionSnippet({
          imageUrl: null,
          width: crop.width,
          height: crop.height
        });
        return;
      }

      snippetContext.drawImage(
        canvas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      setRegionSnippet({
        imageUrl: snippetCanvas.toDataURL("image/png"),
        width: crop.width,
        height: crop.height
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    pdfState.canvasRef,
    pdfState.currentPage,
    pdfState.pageHeight,
    pdfState.pageWidth,
    regionEditor.activeRegion
  ]);

  const statusText = buildStatusText(pdfState.loadStatus, pdfState.errorMessage);

  const currentPageOverlays = useMemo(
    () => overlayDocument?.pages.find((page) => page.pageNumber === pdfState.currentPage)?.regions ?? [],
    [overlayDocument, pdfState.currentPage]
  );

  const activeRegionIndex = useMemo(() => {
    const activeId = regionEditor.activeRegion?.id;
    if (!activeId) {
      return -1;
    }
    return currentPageOverlays.findIndex((region) => region.id === activeId);
  }, [currentPageOverlays, regionEditor.activeRegion?.id]);

  const hasPreviousRegion = activeRegionIndex > 0;
  const hasNextRegion = activeRegionIndex >= 0 && activeRegionIndex < currentPageOverlays.length - 1;

  const navigateRegionByOffset = (offset: number) => {
    if (activeRegionIndex < 0) {
      return;
    }

    const nextIndex = activeRegionIndex + offset;
    if (nextIndex < 0 || nextIndex >= currentPageOverlays.length) {
      return;
    }

    if (regionEditor.hasDialogChanges) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in this region. Discard them and navigate?"
      );
      if (!shouldDiscard) {
        return;
      }
    }

    const targetRegion = currentPageOverlays[nextIndex];
    if (!targetRegion) {
      return;
    }

    regionEditor.openRegionEditor(targetRegion);
  };

  const visiblePageOverlays = useMemo(() => {
    let overlays = currentPageOverlays;

    if (draft && draft.pageNumber === pdfState.currentPage) {
      overlays = currentPageOverlays.map((region) =>
        region.id === draft.regionId
          ? {
              ...region,
              bbox: draft.bbox
            }
          : region
      );
    }

    if (createDraft && createDraft.pageNumber === pdfState.currentPage) {
      const draftRegion: OverlayRegion = {
        id: CREATE_DRAFT_REGION_ID,
        pageNumber: pdfState.currentPage,
        label: "Text",
        bbox: createDraft.bbox,
        matchedContent: false,
        text: "",
        entities: [],
        metadata: {
          pageNumber: Math.max(0, pdfState.currentPage - 1),
          regionId: null
        },
        layoutSource: null,
        contentSource: null
      };
      overlays = [...overlays, draftRegion];
    }

    return overlays;
  }, [createDraft, currentPageOverlays, draft, pdfState.currentPage]);

  const saveIndicatorText = useMemo(() => {
    if (!overlayDocument || !overlaySaveState) {
      return "";
    }
    return buildSaveIndicatorText(
      overlaySaveState.isSaving,
      overlaySaveState.isSaved,
      overlaySaveState.lastSavedAt
    );
  }, [overlayDocument, overlaySaveState]);

  const recordSummary = useMemo(() => {
    if (!pdfState.documentMeta) {
      return "";
    }
    return buildRecordSummary(
      pdfState.documentMeta.fileName,
      pdfState.documentMeta.fileSize,
      pdfState.documentMeta.updatedAt
    );
  }, [pdfState.documentMeta]);

  const retrievalStatusText = useMemo(() => {
    if (retrievalStatus === "loading") {
      return "Retrieving...";
    }

    if (retrievalStatus === "error") {
      return retrievalErrorMessage ?? "Request failed.";
    }

    if (retrievalStatus === "success" && pdfState.documentMeta) {
      return `Loaded ID ${pdfState.documentMeta.id}`;
    }

    return "";
  }, [pdfState.documentMeta, retrievalErrorMessage, retrievalStatus]);

  return (
    <section className={styles.panel} aria-label="Viewer tab">
      <ViewerToolbar
        hasPdf={pdfState.hasPdf}
        currentPage={pdfState.currentPage}
        totalPages={pdfState.totalPages}
        zoom={pdfState.zoom}
        isCreateMode={isCreateMode}
        canCreateBbox={Boolean(overlayDocument)}
        recordSummary={recordSummary}
        overlayCount={visiblePageOverlays.length}
        showOverlayCount={Boolean(overlayDocument && pdfState.hasPdf)}
        saveIndicatorText={saveIndicatorText}
        isSaving={Boolean(overlaySaveState?.isSaving)}
        retrievalInputValue={retrievalInputValue}
        retrievalStatus={retrievalStatus}
        retrievalStatusText={retrievalStatusText}
        canRetryRetrieval={canRetryRetrieval}
        onRetrievalInputChange={onRetrievalInputChange}
        onRetrieveDocument={onRetrieveDocument}
        onResetRetrieval={onResetRetrieval}
        onRetryRetrieval={onRetryRetrieval}
        onMovePage={pdfState.movePage}
        onPageInput={pdfState.handlePageInput}
        onToggleCreateMode={toggleCreateMode}
        onZoomOut={pdfState.handleZoomOut}
        onZoomIn={pdfState.handleZoomIn}
        onFitToWidth={() => {
          void pdfState.handleFitToWidth();
        }}
      />

      <ViewerStatus
        hasPdf={pdfState.hasPdf}
        loadStatus={pdfState.loadStatus}
        statusText={statusText}
      />

      <ViewerCanvasStage
        hasPdf={pdfState.hasPdf}
        pageWidth={pdfState.pageWidth}
        pageHeight={pdfState.pageHeight}
        visiblePageOverlays={visiblePageOverlays}
        isCreateMode={isCreateMode}
        interactionRegionId={interaction?.regionId ?? null}
        canvasContainerRef={pdfState.canvasContainerRef}
        pageStageRef={pdfState.pageStageRef}
        canvasRef={pdfState.canvasRef}
        onBeginCreateBBox={beginCreateBBox}
        onBeginInteraction={beginInteraction}
        onOpenRegionEditor={regionEditor.openRegionEditor}
      />

      <RegionEditorModal
        activeRegion={regionEditor.activeRegion}
        snippet={regionSnippet}
        dialogDraftLabel={regionEditor.dialogDraftLabel}
        dialogDraftText={regionEditor.dialogDraftText}
        dialogTextDirection={regionEditor.dialogTextDirection}
        dialogLabelOptions={regionEditor.dialogLabelOptions}
        pendingSelection={regionEditor.pendingSelection}
        pendingEntity={regionEditor.pendingEntity}
        pickerSelection={regionEditor.pickerSelection}
        spanEditor={regionEditor.spanEditor}
        entityWarning={regionEditor.entityWarning}
        textSegments={regionEditor.textSegments}
        normalizedDraftEntities={regionEditor.normalizedDraftEntities}
        anonymizationEntityLabels={regionEditor.anonymizationEntityLabels}
        canAnonymizeSelection={regionEditor.canAnonymizeSelection}
        hasPreviousRegion={hasPreviousRegion}
        hasNextRegion={hasNextRegion}
        currentRegionOrder={activeRegionIndex >= 0 ? activeRegionIndex + 1 : null}
        totalRegionsOnPage={currentPageOverlays.length}
        dialogTextareaRef={regionEditor.dialogTextareaRef}
        dialogPreviewRef={regionEditor.dialogPreviewRef}
        buildEntityPalette={regionEditor.buildEntityPalette}
        coerceEntityLabel={regionEditor.coerceEntityLabel}
        onClose={regionEditor.closeRegionEditor}
        onLabelChange={regionEditor.setDialogDraftLabel}
        onToggleDirection={() => {
          regionEditor.setDialogTextDirection((previous) => (previous === "rtl" ? "ltr" : "rtl"));
        }}
        onAnonymize={regionEditor.handleAnonymizeSelection}
        onGoPreviousRegion={() => {
          navigateRegionByOffset(-1);
        }}
        onGoNextRegion={() => {
          navigateRegionByOffset(1);
        }}
        onPendingEntityChange={regionEditor.setPendingEntity}
        onApplyPickerEntity={regionEditor.handleApplyPickerEntity}
        onCancelPicker={() => {
          regionEditor.setPickerSelection(null);
          regionEditor.setEntityWarning(null);
        }}
        onEditorInput={regionEditor.handleEditorInput}
        onEditorSelect={regionEditor.refreshPendingSelection}
        onEditorMouseUp={regionEditor.refreshPendingSelection}
        onEditorKeyUp={regionEditor.handleEditorKeyUp}
        onOpenSpanEditor={regionEditor.handleOpenSpanEditor}
        onSpanEditorEntityChange={(nextEntity) => {
          regionEditor.setSpanEditor((previous) =>
            previous
              ? {
                  ...previous,
                  entity: nextEntity
                }
              : previous
          );
        }}
        onApplySpanEditor={regionEditor.handleApplySpanEditor}
        onRemoveSpan={regionEditor.handleRemoveSpan}
        onCancelSpanEditor={() => regionEditor.setSpanEditor(null)}
        onSave={regionEditor.handleSaveRegionEditor}
        onReset={regionEditor.handleResetRegionEditor}
        onDelete={regionEditor.handleDeleteRegionEditor}
      />
    </section>
  );
}

export const PdfViewerTab = memo(PdfViewerTabComponent);
