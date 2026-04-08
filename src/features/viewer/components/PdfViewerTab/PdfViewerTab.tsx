import { memo, useEffect, useMemo } from "react";
import { useCreateBBox } from "../../hooks/useCreateBBox";
import { useBboxClipboard } from "../../hooks/useBboxClipboard";
import { useOverlayInteractions } from "../../hooks/useOverlayInteractions";
import { usePageRegionNavigation } from "../../hooks/usePageRegionNavigation";
import { usePdfDocument } from "../../hooks/usePdfDocument";
import { useRegionEditor } from "../../hooks/useRegionEditor";
import { useRegionSnippet } from "../../hooks/useRegionSnippet";
import { resolveViewerEditCapabilities } from "../../utils/viewerEditCapabilities";
import { buildVisiblePageOverlays } from "../../utils/visiblePageOverlays";
import { buildRecordSummary, buildSaveIndicatorText, buildStatusText } from "../../utils/viewerStatus";
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
  anonymizationEntityLabels,
  defaultAnonymizationEntityLabel,
  defaultTextDirection,
  isBboxStructuralEditingEnabled,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: PdfViewerTabProps) {
  const editCapabilities = useMemo(
    () => resolveViewerEditCapabilities(isBboxStructuralEditingEnabled),
    [isBboxStructuralEditingEnabled]
  );
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
    isBboxStructuralEditingEnabled,
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
    isBboxStructuralEditingEnabled,
    overlayDocument,
    onOverlayEditStarted,
    onOverlayDocumentSaved
  });
  const bboxClipboard = useBboxClipboard({
    overlayDocument,
    currentPage: pdfState.currentPage,
    isBboxStructuralEditingEnabled: editCapabilities.isBboxStructuralEditingEnabled,
    isTextCopyEnabled: editCapabilities.isTextCopyEnabled,
    onOverlayEditStarted,
    onOverlayDocumentSaved
  });
  const regionEditor = useRegionEditor({
    overlayDocument,
    currentPage: pdfState.currentPage,
    copiedBbox: bboxClipboard.copiedBbox,
    isBboxStructuralEditingEnabled: editCapabilities.isBboxStructuralEditingEnabled,
    isRawTextEditingEnabled: editCapabilities.isRawTextEditingEnabled,
    anonymizationEntityLabels,
    defaultAnonymizationEntityLabel,
    defaultTextDirection,
    onOverlayEditStarted,
    onOverlayDocumentSaved
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
  const currentPageOverlays =
    overlayDocument?.pages.find((page) => page.pageNumber === pdfState.currentPage)?.regions ?? [];
  const regionNavigation = usePageRegionNavigation({
    regions: currentPageOverlays,
    activeRegionId: regionEditor.activeRegion?.id,
    hasDialogChanges: regionEditor.hasDialogChanges,
    onOpenRegionEditor: regionEditor.openRegionEditor
  });
  const handleSaveRegionEditorAndGoNext = () => {
    const didSave = regionEditor.handleSaveRegionEditor();
    if (!didSave || !regionNavigation.hasNextRegion) {
      return;
    }
    regionNavigation.goNextRegionAfterSave();
  };
  const visiblePageOverlays = buildVisiblePageOverlays(
    currentPageOverlays,
    pdfState.currentPage,
    draft,
    createDraft
  );
  const anonymizedEntityCount = currentPageOverlays.reduce(
    (count, region) => count + (region.entities?.length ?? 0),
    0
  );
  const saveIndicatorText =
    overlayDocument && overlaySaveState
      ? buildSaveIndicatorText(
          overlaySaveState.isSaving,
          overlaySaveState.isSaved,
          overlaySaveState.lastSavedAt
        )
      : "";
  const recordSummary = pdfState.documentMeta
    ? buildRecordSummary(
        pdfState.documentMeta.fileName,
        pdfState.documentMeta.fileSize,
        pdfState.documentMeta.updatedAt
      )
    : "";
  let retrievalStatusText = "";
  if (retrievalStatus === "loading") {
    retrievalStatusText = "Retrieving...";
  } else if (retrievalStatus === "error") {
    retrievalStatusText = retrievalErrorMessage ?? "Request failed.";
  } else if (retrievalStatus === "success" && pdfState.documentMeta) {
    retrievalStatusText = `Loaded ID ${pdfState.documentMeta.id}`;
  }
  return (
    <section className={styles.panel} aria-label="Viewer tab">
      <ViewerToolbar
        hasPdf={pdfState.hasPdf}
        currentPage={pdfState.currentPage}
        totalPages={pdfState.totalPages}
        zoom={pdfState.zoom}
        isCreateMode={isCreateMode}
        canCreateBbox={Boolean(overlayDocument) && isBboxStructuralEditingEnabled}
        isBboxStructuralEditingEnabled={isBboxStructuralEditingEnabled}
        hasCopiedBbox={bboxClipboard.hasCopiedBbox}
        recordSummary={recordSummary}
        overlayCount={visiblePageOverlays.length}
        showOverlayCount={Boolean(overlayDocument && pdfState.hasPdf)}
        anonymizedEntityCount={anonymizedEntityCount}
        showAnonymizedEntityCount={Boolean(overlayDocument && pdfState.hasPdf)}
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
        onPasteCopiedBbox={bboxClipboard.pasteCopiedBbox}
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
        isBboxStructuralEditingEnabled={editCapabilities.isBboxStructuralEditingEnabled}
        isTextCopyEnabled={editCapabilities.isTextCopyEnabled}
        interactionRegionId={interaction?.regionId ?? null}
        canvasContainerRef={pdfState.canvasContainerRef}
        pageStageRef={pdfState.pageStageRef}
        canvasRef={pdfState.canvasRef}
        onBeginCreateBBox={beginCreateBBox}
        onBeginInteraction={beginInteraction}
        onOpenRegionEditor={regionEditor.openRegionEditor}
        onChangeRegionLabel={regionEditor.updateRegionLabelWithCanonicalFlow}
        onDeleteRegion={regionEditor.deleteRegionWithCanonicalFlow}
        onCopyRegion={bboxClipboard.copyBbox}
        onCopyRegionText={(region) => {
          void bboxClipboard.copyTextOnly(region);
        }}
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
        previewModel={regionEditor.previewModel}
        normalizedDraftEntities={regionEditor.normalizedDraftEntities}
        anonymizationEntityLabels={regionEditor.anonymizationEntityLabels}
        canAnonymizeSelection={regionEditor.canAnonymizeSelection}
        hasFirstRegion={regionNavigation.hasFirstRegion}
        hasLastRegion={regionNavigation.hasLastRegion}
        hasPreviousRegion={regionNavigation.hasPreviousRegion}
        hasNextRegion={regionNavigation.hasNextRegion}
        currentRegionOrder={regionNavigation.activeRegionIndex >= 0 ? regionNavigation.activeRegionIndex + 1 : null}
        totalRegionsOnPage={regionNavigation.totalRegions}
        dialogTextareaRef={regionEditor.dialogTextareaRef}
        dialogPreviewRef={regionEditor.dialogPreviewRef}
        buildEntityPalette={regionEditor.buildEntityPalette}
        coerceEntityLabel={regionEditor.coerceEntityLabel}
        onClose={regionEditor.closeRegionEditor}
        onLabelChange={regionEditor.handleDialogDraftLabelChange}
        onToggleDirection={() => {
          regionEditor.setDialogTextDirection((previous: "rtl" | "ltr") => (previous === "rtl" ? "ltr" : "rtl"));
        }}
        onAnonymize={regionEditor.handleAnonymizeSelection}
        onGoFirstRegion={regionNavigation.goFirstRegion}
        onGoLastRegion={regionNavigation.goLastRegion}
        onGoPreviousRegion={regionNavigation.goPreviousRegion}
        onGoNextRegion={regionNavigation.goNextRegion}
        onGoRegionByOrder={regionNavigation.goRegionByOrder}
        onPendingEntityChange={regionEditor.handlePendingEntityChange}
        onCancelPicker={regionEditor.handleCancelPicker}
        onEditorInput={regionEditor.handleEditorInput}
        onEditorSelect={regionEditor.refreshPendingSelection}
        onEditorMouseUp={regionEditor.refreshPendingSelection}
        onEditorKeyUp={regionEditor.handleEditorKeyUp}
        onOpenSpanEditor={regionEditor.handleOpenSpanEditor}
        onSpanEditorEntityChange={regionEditor.handleSpanEditorEntityChange}
        onRemoveSpan={regionEditor.handleRemoveSpan}
        onCancelSpanEditor={regionEditor.handleCancelSpanEditor}
        onSave={handleSaveRegionEditorAndGoNext}
        onReset={regionEditor.handleResetRegionEditor}
        onDelete={regionEditor.handleDeleteRegionEditor}
        onCopyRegion={bboxClipboard.copyBbox}
        isRawTextEditingEnabled={regionEditor.isRawTextEditingEnabled}
        isTextCopyEnabled={editCapabilities.isTextCopyEnabled}
        isBboxStructuralEditingEnabled={isBboxStructuralEditingEnabled}
        hasCopiedBbox={bboxClipboard.hasCopiedBbox}
        onPasteRegionFromClipboard={regionEditor.handlePasteCopiedBboxIntoRegion}
        onCopyRegionText={(region) => {
          void bboxClipboard.copyTextOnly(region);
        }}
      />
    </section>
  );
}

export const PdfViewerTab = memo(PdfViewerTabComponent);
