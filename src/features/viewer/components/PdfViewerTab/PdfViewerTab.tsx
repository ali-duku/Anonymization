import { memo, useEffect, useMemo } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import { CREATE_DRAFT_REGION_ID } from "../../constants/viewerConstants";
import { useCreateBBox } from "../../hooks/useCreateBBox";
import { useOverlayInteractions } from "../../hooks/useOverlayInteractions";
import { usePdfDocument } from "../../hooks/usePdfDocument";
import { useRegionEditor } from "../../hooks/useRegionEditor";
import { useViewerPersistence } from "../../hooks/useViewerPersistence";
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
  storageService,
  overlayDocument = null,
  overlaySaveState = null,
  onOverlayEditStarted,
  onOverlayDocumentSaved
}: PdfViewerTabProps) {
  const pdfState = usePdfDocument({ storageService });

  useViewerPersistence({
    storageService,
    recordMeta: pdfState.recordMeta,
    pdfDoc: pdfState.pdfDoc,
    loadStatus: pdfState.loadStatus,
    currentPage: pdfState.currentPage,
    zoom: pdfState.zoom
  });

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

  const statusText = buildStatusText(pdfState.loadStatus, pdfState.errorMessage);

  const currentPageOverlays = useMemo(
    () => overlayDocument?.pages.find((page) => page.pageNumber === pdfState.currentPage)?.regions ?? [],
    [overlayDocument, pdfState.currentPage]
  );

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
    if (!pdfState.recordMeta) {
      return "";
    }
    return buildRecordSummary(
      pdfState.recordMeta.fileName,
      pdfState.recordMeta.fileSize,
      pdfState.recordMeta.updatedAt
    );
  }, [pdfState.recordMeta]);

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
        fileInputRef={pdfState.fileInputRef}
        onFilePick={pdfState.handleFilePick}
        onFileChange={pdfState.handleFileChange}
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
        onFilePick={pdfState.handleFilePick}
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
