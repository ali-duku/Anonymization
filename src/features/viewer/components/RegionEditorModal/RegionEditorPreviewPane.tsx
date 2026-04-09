import { memo, useCallback, useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { RegionPreviewModel } from "../../utils/previewModel";
import type { SpanBoundarySide, SpanBoundaryState } from "../../utils/spanBoundaries";
import { resolvePreviewOffsetFromPoint } from "../../utils/previewOffset";
import type { RegionEditorModalProps } from "./RegionEditorModal.types";
import styles from "./RegionEditorModal.module.css";
import handleStyles from "./RegionEditorPreviewPane.module.css";
interface RegionEditorPreviewPaneProps {
  dialogPreviewRef: RefObject<HTMLDivElement>;
  dialogTextDirection: "rtl" | "ltr";
  dialogDraftTextLength: number;
  previewModel: RegionPreviewModel;
  buildEntityPalette: (entity: string) => { background: string; text: string; border: string };
  onOpenSpanEditor: (index: number, anchorX: number, anchorY: number) => void;
  spanBoundaryControls: RegionEditorModalProps["spanBoundaryControls"];
}
interface HandleVisibility {
  start: Set<string>;
  end: Set<string>;
}
function buildHandleVisibilityMap(previewModel: RegionPreviewModel): HandleVisibility {
  const start = new Set<string>();
  const endByIndex = new Map<number, string>();
  const seenEntityIndices = new Set<number>();

  const register = (key: string, entityIndex: number | null) => {
    if (entityIndex === null) {
      return;
    }
    if (!seenEntityIndices.has(entityIndex)) {
      seenEntityIndices.add(entityIndex);
      start.add(key);
    }
    endByIndex.set(entityIndex, key);
  };

  if (previewModel.kind === "plain_text") {
    previewModel.segments.forEach((segment, index) => {
      register(`plain-${index}`, segment.entityIndex);
    });
  } else {
    previewModel.rows.forEach((row, rowIndex) => {
      row.cells.forEach((cell, cellIndex) => {
        cell.fragments.forEach((fragment, fragmentIndex) => {
          register(`table-${rowIndex}-${cellIndex}-${fragmentIndex}`, fragment.entityIndex);
        });
      });
    });
  }

  return {
    start,
    end: new Set(endByIndex.values())
  };
}
function RegionEditorPreviewPaneComponent({
  dialogPreviewRef,
  dialogTextDirection,
  dialogDraftTextLength,
  previewModel,
  buildEntityPalette,
  onOpenSpanEditor,
  spanBoundaryControls
}: RegionEditorPreviewPaneProps) {
  const activePointerRef = useRef<number | null>(null);
  const handleVisibility = useMemo(() => buildHandleVisibilityMap(previewModel), [previewModel]);
  const resolveOffset = useCallback(
    (clientX: number, clientY: number): number | null =>
      resolvePreviewOffsetFromPoint(
        dialogPreviewRef.current,
        clientX,
        clientY,
        dialogDraftTextLength
      ),
    [dialogDraftTextLength, dialogPreviewRef]
  );
  const beginDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      entityIndex: number,
      side: SpanBoundarySide
    ) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      activePointerRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      spanBoundaryControls.handleStartBoundaryDrag(entityIndex, side);
      const offset = resolveOffset(event.clientX, event.clientY);
      if (offset !== null) {
        spanBoundaryControls.handleUpdateBoundaryDrag(offset);
      }
    },
    [resolveOffset, spanBoundaryControls]
  );
  const updateDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (activePointerRef.current !== event.pointerId) {
        return;
      }
      const offset = resolveOffset(event.clientX, event.clientY);
      if (offset !== null) {
        spanBoundaryControls.handleUpdateBoundaryDrag(offset);
      }
    },
    [resolveOffset, spanBoundaryControls]
  );
  const endDragCommit = useCallback((pointerId: number) => {
    if (activePointerRef.current !== pointerId) {
      return;
    }
    activePointerRef.current = null;
    spanBoundaryControls.handleEndBoundaryDragCommit();
  }, [spanBoundaryControls]);
  const cancelDrag = useCallback((pointerId: number) => {
    if (activePointerRef.current !== pointerId) {
      return;
    }
    activePointerRef.current = null;
    spanBoundaryControls.handleCancelBoundaryDrag();
  }, [spanBoundaryControls]);
  const handleBoundaryKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number, side: SpanBoundarySide) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        spanBoundaryControls.handleAdjustBoundaryStep(index, side, -1);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        spanBoundaryControls.handleAdjustBoundaryStep(index, side, 1);
      }
    },
    [spanBoundaryControls]
  );
  const renderBoundaryHandle = useCallback(
    (
      entityIndex: number,
      side: SpanBoundarySide,
      shouldRender: boolean,
      limitState: SpanBoundaryState | null
    ) => {
      if (!shouldRender || !limitState) {
        return null;
      }
      const isStart = side === "start";
      const canMove =
        side === "start"
          ? limitState.start > limitState.limits.minStart || limitState.start < limitState.limits.maxStart
          : limitState.end > limitState.limits.minEnd || limitState.end < limitState.limits.maxEnd;
      const isActive =
        spanBoundaryControls.activeBoundaryDrag?.index === entityIndex &&
        spanBoundaryControls.activeBoundaryDrag.side === side;

      return (
        <button
          type="button"
          className={[
            handleStyles.boundaryHandle,
            isStart ? handleStyles.boundaryHandleStart : handleStyles.boundaryHandleEnd,
            isActive ? handleStyles.boundaryHandleActive : ""
          ].join(" ")}
          aria-label={`${isStart ? "Adjust start boundary" : "Adjust end boundary"} for span ${entityIndex + 1}`}
          title={isStart ? "Drag to adjust start boundary" : "Drag to adjust end boundary"}
          disabled={!canMove}
          onPointerDown={(event) => beginDrag(event, entityIndex, side)}
          onPointerMove={updateDrag}
          onPointerUp={(event) => endDragCommit(event.pointerId)}
          onPointerCancel={(event) => cancelDrag(event.pointerId)}
          onLostPointerCapture={(event) => endDragCommit(event.pointerId)}
          onKeyDown={(event) => handleBoundaryKeyDown(event, entityIndex, side)}
        />
      );
    },
    [beginDrag, cancelDrag, endDragCommit, handleBoundaryKeyDown, spanBoundaryControls, updateDrag]
  );
  const renderEntityFragment = useCallback(
    (
      key: string,
      entityIndex: number,
      entity: string,
      text: string,
      start: number,
      end: number
    ) => {
      const palette = buildEntityPalette(entity);
      const showStart = handleVisibility.start.has(key);
      const showEnd = handleVisibility.end.has(key);
      const boundaryState = spanBoundaryControls.getSpanBoundaryStateByIndex(entityIndex);
      return (
        <span
          key={key}
          className={`${styles.entitySpan} ${handleStyles.entityToken}`}
          style={{ background: palette.background, color: palette.text, ["--entity-border-color" as string]: palette.border } as CSSProperties}
          title={`${entity} [${start}-${end}]`}
          data-range-start={start}
          data-range-end={end}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            onOpenSpanEditor(entityIndex, rect.left, rect.bottom + 6);
          }}
        >
          {renderBoundaryHandle(entityIndex, "start", showStart, boundaryState)}
          {text}
          {renderBoundaryHandle(entityIndex, "end", showEnd, boundaryState)}
        </span>
      );
    },
    [
      buildEntityPalette,
      handleVisibility.end,
      handleVisibility.start,
      onOpenSpanEditor,
      renderBoundaryHandle,
      spanBoundaryControls
    ]
  );
  return (
    <div ref={dialogPreviewRef} className={styles.textPreview} dir={dialogTextDirection}>
      {previewModel.kind === "plain_text"
        ? previewModel.segments.map((segment, index) => {
            const key = `plain-${index}`;
            if (segment.entityIndex === null || !segment.entity) {
              return (
                <span
                  key={key}
                  className={styles.segment}
                  data-range-start={segment.start}
                  data-range-end={segment.end}
                >
                  {segment.text}
                </span>
              );
            }
            return renderEntityFragment(
              key,
              segment.entityIndex,
              segment.entity,
              segment.text,
              segment.start,
              segment.end
            );
          })
        : (
            <table className={styles.previewTable}>
              <tbody>
                {previewModel.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {row.cells.map((cell, cellIndex) => {
                      const CellTag = cell.kind === "th" ? "th" : "td";
                      return (
                        <CellTag
                          key={`cell-${rowIndex}-${cellIndex}`}
                          className={styles.previewTableCell}
                          colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                          rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                        >
                          {cell.fragments.map((fragment, fragmentIndex) => {
                            const key = `table-${rowIndex}-${cellIndex}-${fragmentIndex}`;
                            const fragmentStart = fragment.start ?? 0;
                            const fragmentEnd = fragment.end ?? fragmentStart;
                            if (fragment.entityIndex === null || !fragment.entity) {
                              return (
                                <span
                                  key={key}
                                  className={styles.segment}
                                  data-range-start={fragmentStart}
                                  data-range-end={fragmentEnd}
                                >
                                  {fragment.text}
                                </span>
                              );
                            }
                            return renderEntityFragment(
                              key,
                              fragment.entityIndex,
                              fragment.entity,
                              fragment.text,
                              fragmentStart,
                              fragmentEnd
                            );
                          })}
                        </CellTag>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
    </div>
  );
}
export const RegionEditorPreviewPane = memo(RegionEditorPreviewPaneComponent);
