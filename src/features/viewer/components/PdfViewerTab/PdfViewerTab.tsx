import { memo, useEffect, useMemo } from "react";
import { useCreateBBox } from "../../hooks/useCreateBBox";
import { useOverlayInteractions } from "../../hooks/useOverlayInteractions";
import { usePageRegionNavigation } from "../../hooks/usePageRegionNavigation";
import { usePdfDocument } from "../../hooks/usePdfDocument";
import { useRegionEditor } from "../../hooks/useRegionEditor";
import { useRegionSnippet } from "../../hooks/useRegionSnippet";
import { useViewerAutoFit } from "../../hooks/useViewerAutoFit";
import { buildVisiblePageOverlays } from "../../utils/visiblePageOverlays";
import {
  buildRecordSummary,
  buildSaveIndicatorText,
  buildStatusText
} from "../../utils/viewerStatus";
import { RegionEditorModal } from "../RegionEditorModal/RegionEditorModal";
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
  manualFileInputRef,
  onManualFilePick,
  onManualFileChange,
  manualUploadStatusText,
  manualUploadStatusTone = "neutral",
  overlayDocument = null,
  overlaySaveState = null,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: PdfViewerTabProps) {
  const pdfState = usePdfDocument({ retrievedPdfDocument });

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

  useViewerAutoFit({
    hasPdf: pdfState.hasPdf,
    documentMeta: pdfState.documentMeta,
    onFitToWidth: pdfState.handleFitToWidth
  });

  const regionSnippet = useRegionSnippet({
    activeRegion: regionEditor.activeRegion,
    canvasRef: pdfState.canvasRef,
    currentPage: pdfState.currentPage,
    pageWidth: pdfState.pageWidth,
    pageHeight: pdfState.pageHeight
  });

  useEffect(() => {
    resetOverlayInteractionState();
    setIsCreateMode(false);
    resetCreateState();
  }, [overlayDocument, pdfState.currentPage, resetCreateState, resetOverlayInteractionState, setIsCreateMode]);

  const statusText = buildStatusText(pdfState.loadStatus, pdfState.errorMessage);

  const currentPageOverlays = useMemo(
    () => overlayDocument?.pages.find((page) => page.pageNumber === pdfState.currentPage)?.regions ?? [],
    [overlayDocument, pdfState.currentPage]
  );

  const regionNavigation = usePageRegionNavigation({
    regions: currentPageOverlays,
    activeRegionId: regionEditor.activeRegion?.id,
    hasDialogChanges: regionEditor.hasDialogChanges,
    onOpenRegionEditor: regionEditor.openRegionEditor
  });

  const visiblePageOverlays = useMemo(() => {
    return buildVisiblePageOverlays(currentPageOverlays, pdfState.currentPage, draft, createDraft);
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
        manualFileInputRef={manualFileInputRef}
        onManualFilePick={onManualFilePick}
        onManualFileChange={onManualFileChange}
        manualUploadStatusText={manualUploadStatusText ?? ""}
        manualUploadStatusTone={manualUploadStatusTone}
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
        onManualFilePick={onManualFilePick}
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
        hasPreviousRegion={regionNavigation.hasPreviousRegion}
        hasNextRegion={regionNavigation.hasNextRegion}
        currentRegionOrder={regionNavigation.activeRegionIndex >= 0 ? regionNavigation.activeRegionIndex + 1 : null}
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
        onGoPreviousRegion={regionNavigation.goPreviousRegion}
        onGoNextRegion={regionNavigation.goNextRegion}
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
