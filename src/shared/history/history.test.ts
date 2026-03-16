import { describe, expect, it } from "vitest";
import {
  canRedoHistory,
  canUndoHistory,
  commitHistory,
  createHistoryState,
  redoHistory,
  replacePresentHistory,
  resetHistory,
  undoHistory
} from "./history";

describe("history utility", () => {
  it("commits state and supports undo/redo", () => {
    let history = createHistoryState<number>(0);
    history = commitHistory(history, 1, { action: "increment" });
    history = commitHistory(history, 2, { action: "increment" });

    expect(history.present.state).toBe(2);
    expect(canUndoHistory(history)).toBe(true);
    expect(canRedoHistory(history)).toBe(false);

    history = undoHistory(history);
    expect(history.present.state).toBe(1);
    expect(canRedoHistory(history)).toBe(true);

    history = redoHistory(history);
    expect(history.present.state).toBe(2);
    expect(canRedoHistory(history)).toBe(false);
  });

  it("clears future history when a new commit is made after undo", () => {
    let history = createHistoryState<number>(0);
    history = commitHistory(history, 1);
    history = commitHistory(history, 2);
    history = undoHistory(history);

    expect(canRedoHistory(history)).toBe(true);

    history = commitHistory(history, 5);
    expect(history.present.state).toBe(5);
    expect(canRedoHistory(history)).toBe(false);
  });

  it("skips commit when comparator indicates equivalent state", () => {
    type Item = { id: number; name: string };
    let history = createHistoryState<Item>({ id: 1, name: "A" });

    history = commitHistory(
      history,
      { id: 1, name: "A" },
      { action: "same" },
      (left, right) => left.id === right.id && left.name === right.name
    );

    expect(history.past).toHaveLength(0);
    expect(history.present.meta).toBeUndefined();
  });

  it("enforces max history limit by trimming oldest past entries", () => {
    let history = createHistoryState<number>(0, { limit: 2 });
    history = commitHistory(history, 1);
    history = commitHistory(history, 2);
    history = commitHistory(history, 3);

    expect(history.past).toHaveLength(2);
    expect(history.past[0].state).toBe(1);
    expect(history.past[1].state).toBe(2);
    expect(history.present.state).toBe(3);
  });

  it("resets to a fresh initial state", () => {
    let history = createHistoryState<number>(0);
    history = commitHistory(history, 3);
    history = resetHistory(history, 9, { action: "reset" });

    expect(history.present.state).toBe(9);
    expect(history.present.meta?.action).toBe("reset");
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);
  });

  it("replaces present without affecting past/future", () => {
    let history = createHistoryState<number>(0);
    history = commitHistory(history, 1);
    history = replacePresentHistory(history, 2, { action: "save-state" });

    expect(history.present.state).toBe(2);
    expect(history.present.meta?.action).toBe("save-state");
    expect(history.past).toHaveLength(1);
    expect(history.future).toHaveLength(0);
  });
});
