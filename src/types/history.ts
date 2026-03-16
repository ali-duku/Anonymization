export interface HistoryMeta {
  action?: string;
}

export interface HistoryEntry<T> {
  state: T;
  meta?: HistoryMeta;
}

export interface HistoryState<T> {
  past: HistoryEntry<T>[];
  present: HistoryEntry<T>;
  future: HistoryEntry<T>[];
  limit: number;
}

export interface HistoryController<T> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  commit: (nextState: T, meta?: HistoryMeta) => void;
  undo: () => void;
  redo: () => void;
  reset: (initialState: T, meta?: HistoryMeta) => void;
}
