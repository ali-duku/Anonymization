import type { RefObject } from "react";
import type { OverlayRegion } from "../../../../types/overlay";
import type { RegionEditorSnippet } from "./RegionEditorModal.types";
import styles from "./RegionEditorModal.module.css";

interface RegionEditorSnippetPaneProps {
  activeRegion: OverlayRegion;
  snippet: RegionEditorSnippet | null;
  currentRegionOrder: number | null;
  totalRegionsOnPage: number;
  snippetZoom: number;
  snippetZoomPercent: number;
  minSnippetZoom: number;
  maxSnippetZoom: number;
  defaultSnippetZoom: number;
  snippetZoomStep: number;
  hasPreviousRegion: boolean;
  hasNextRegion: boolean;
  snippetPaneRef: RefObject<HTMLElement>;
  snippetProtectedRef: RefObject<HTMLDivElement>;
  onGoPreviousRegion: () => void;
  onGoNextRegion: () => void;
  onSnippetZoomChange: (nextZoom: number) => void;
}

export function RegionEditorSnippetPane({
  activeRegion,
  snippet,
  currentRegionOrder,
  totalRegionsOnPage,
  snippetZoom,
  snippetZoomPercent,
  minSnippetZoom,
  maxSnippetZoom,
  defaultSnippetZoom,
  snippetZoomStep,
  hasPreviousRegion,
  hasNextRegion,
  snippetPaneRef,
  snippetProtectedRef,
  onGoPreviousRegion,
  onGoNextRegion,
  onSnippetZoomChange
}: RegionEditorSnippetPaneProps) {
  return (
    <aside ref={snippetPaneRef} className={styles.snippetPane}>
      <div ref={snippetProtectedRef} className={styles.snippetProtected}>
        <header className={styles.snippetHeader}>
          <h2 id="region-editor-title">Region Context</h2>
          <div className={styles.snippetMeta}>
            <span>P{activeRegion.metadata.pageNumber ?? "?"}</span>
            <span>R{activeRegion.metadata.regionId ?? "?"}</span>
            <span>
              {currentRegionOrder && totalRegionsOnPage > 0
                ? `${currentRegionOrder}/${totalRegionsOnPage}`
                : "-"}
            </span>
          </div>
        </header>

        <div className={styles.snippetControls}>
          <div className={styles.snippetNavButtons}>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={onGoPreviousRegion}
              disabled={!hasPreviousRegion}
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={onGoNextRegion}
              disabled={!hasNextRegion}
            >
              Next
            </button>
          </div>
          <div className={styles.snippetZoomControls}>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={() => onSnippetZoomChange(snippetZoom - snippetZoomStep)}
              disabled={snippetZoom <= minSnippetZoom}
              aria-label="Zoom out snippet"
            >
              -
            </button>
            <span className={styles.snippetZoomValue}>{snippetZoomPercent}%</span>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={() => onSnippetZoomChange(snippetZoom + snippetZoomStep)}
              disabled={snippetZoom >= maxSnippetZoom}
              aria-label="Zoom in snippet"
            >
              +
            </button>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={() => onSnippetZoomChange(defaultSnippetZoom)}
              disabled={snippetZoom === defaultSnippetZoom}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div
        className={styles.snippetViewport}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
      >
        {snippet?.imageUrl ? (
          <img
            className={styles.snippetImage}
            src={snippet.imageUrl}
            alt="PDF snippet for selected region"
            draggable={false}
            onDragStart={(event) => {
              event.preventDefault();
            }}
            onContextMenu={(event) => {
              event.preventDefault();
            }}
            style={{ width: `${snippetZoomPercent}%` }}
          />
        ) : (
          <p className={styles.snippetFallback}>Snippet unavailable for this region.</p>
        )}
      </div>
    </aside>
  );
}
