import type { HistoryMeta, HistoryState } from "../../types/history";

const DEFAULT_HISTORY_LIMIT = 100;

type EqualityFn<T> = (left: T, right: T) => boolean;

function defaultEquality<T>(left: T, right: T): boolean {
  return Object.is(left, right);
}

export function createHistoryState<T>(
  initialState: T,
  options?: { limit?: number; meta?: HistoryMeta }
): HistoryState<T> {
  const limit = options?.limit ?? DEFAULT_HISTORY_LIMIT;
  return {
    past: [],
    present: {
      state: initialState,
      meta: options?.meta
    },
    future: [],
    limit: Math.max(1, limit)
  };
}

export function canUndoHistory<T>(history: HistoryState<T>): boolean {
  return history.past.length > 0;
}

export function canRedoHistory<T>(history: HistoryState<T>): boolean {
  return history.future.length > 0;
}

export function commitHistory<T>(
  history: HistoryState<T>,
  nextState: T,
  meta?: HistoryMeta,
  isEqual: EqualityFn<T> = defaultEquality
): HistoryState<T> {
  if (isEqual(history.present.state, nextState)) {
    return history;
  }

  const nextPast = [...history.past, history.present];
  const trimmedPast =
    nextPast.length > history.limit ? nextPast.slice(nextPast.length - history.limit) : nextPast;

  return {
    ...history,
    past: trimmedPast,
    present: { state: nextState, meta },
    future: []
  };
}

export function replacePresentHistory<T>(
  history: HistoryState<T>,
  nextState: T,
  meta?: HistoryMeta,
  isEqual: EqualityFn<T> = defaultEquality
): HistoryState<T> {
  if (isEqual(history.present.state, nextState)) {
    return history;
  }

  return {
    ...history,
    present: { state: nextState, meta }
  };
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (!canUndoHistory(history)) {
    return history;
  }

  const previous = history.past[history.past.length - 1];
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future]
  };
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (!canRedoHistory(history)) {
    return history;
  }

  const [nextPresent, ...remainingFuture] = history.future;
  return {
    ...history,
    past: [...history.past, history.present],
    present: nextPresent,
    future: remainingFuture
  };
}

export function resetHistory<T>(
  history: HistoryState<T>,
  initialState: T,
  meta?: HistoryMeta
): HistoryState<T> {
  return {
    ...history,
    past: [],
    present: {
      state: initialState,
      meta
    },
    future: []
  };
}
