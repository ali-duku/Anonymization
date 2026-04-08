import { useCallback, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
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
  hasFirstRegion: boolean;
  hasLastRegion: boolean;
  hasPreviousRegion: boolean;
  hasNextRegion: boolean;
  snippetPaneRef: RefObject<HTMLElement>;
  snippetProtectedRef: RefObject<HTMLDivElement>;
  onGoFirstRegion: () => void;
  onGoLastRegion: () => void;
  onGoPreviousRegion: () => void;
  onGoNextRegion: () => void;
  onGoRegionByOrder: (order: number) => void;
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
  hasFirstRegion,
  hasLastRegion,
  hasPreviousRegion,
  hasNextRegion,
  snippetPaneRef,
  snippetProtectedRef,
  onGoFirstRegion,
  onGoLastRegion,
  onGoPreviousRegion,
  onGoNextRegion,
  onGoRegionByOrder,
  onSnippetZoomChange
}: RegionEditorSnippetPaneProps) {
  const resolvedCurrentOrder = useMemo(
    () => (currentRegionOrder && totalRegionsOnPage > 0 ? currentRegionOrder : null),
    [currentRegionOrder, totalRegionsOnPage]
  );

  const [regionOrderInput, setRegionOrderInput] = useState("");

  useEffect(() => {
    setRegionOrderInput(resolvedCurrentOrder ? String(resolvedCurrentOrder) : "");
  }, [resolvedCurrentOrder]);

  const restoreRegionOrderInput = useCallback(() => {
    setRegionOrderInput(resolvedCurrentOrder ? String(resolvedCurrentOrder) : "");
  }, [resolvedCurrentOrder]);

  const commitRegionOrderInput = useCallback(() => {
    if (!resolvedCurrentOrder || totalRegionsOnPage <= 0) {
      restoreRegionOrderInput();
      return;
    }

    if (!/^\d+$/.test(regionOrderInput)) {
      restoreRegionOrderInput();
      return;
    }

    const nextOrder = Number(regionOrderInput);
    if (!Number.isInteger(nextOrder) || nextOrder < 1 || nextOrder > totalRegionsOnPage) {
      restoreRegionOrderInput();
      return;
    }

    if (nextOrder !== resolvedCurrentOrder) {
      onGoRegionByOrder(nextOrder);
    }

    restoreRegionOrderInput();
  }, [
    onGoRegionByOrder,
    regionOrderInput,
    resolvedCurrentOrder,
    restoreRegionOrderInput,
    totalRegionsOnPage
  ]);

  const handleRegionOrderKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRegionOrderInput();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      restoreRegionOrderInput();
    }
  };

  const hasRegionOrderContext = resolvedCurrentOrder !== null && totalRegionsOnPage > 0;

  return (
    <aside ref={snippetPaneRef} className={styles.snippetPane}>
      <div ref={snippetProtectedRef} className={styles.snippetProtected}>
        <header className={styles.snippetHeader}>
          <h2 id="region-editor-title">Region Context</h2>
          <div className={styles.snippetMeta}>
            <span>P{activeRegion.metadata.pageNumber ?? "?"}</span>
            <span>R{activeRegion.metadata.regionId ?? "?"}</span>
          </div>
        </header>

        <div className={styles.snippetControls}>
          <div className={styles.snippetNavButtons}>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={onGoFirstRegion}
              disabled={!hasFirstRegion}
            >
              First
            </button>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={onGoPreviousRegion}
              disabled={!hasPreviousRegion}
            >
              Previous
            </button>
            <label className={styles.snippetRegionOrderField}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={styles.snippetRegionOrderInput}
                value={regionOrderInput}
                disabled={!hasRegionOrderContext}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  if (/^\d*$/.test(nextValue)) {
                    setRegionOrderInput(nextValue);
                  }
                }}
                onBlur={commitRegionOrderInput}
                onKeyDown={handleRegionOrderKeyDown}
                aria-label="Region number on current page"
              />
              <span className={styles.snippetRegionOrderTotal}>/ {Math.max(totalRegionsOnPage, 0)}</span>
            </label>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={onGoNextRegion}
              disabled={!hasNextRegion}
            >
              Next
            </button>
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={onGoLastRegion}
              disabled={!hasLastRegion}
            >
              Last
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
