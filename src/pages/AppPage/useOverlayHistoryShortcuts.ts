import { useEffect } from "react";

interface UseOverlayHistoryShortcutsOptions {
  canUndo: boolean;
  canRedo: boolean;
  currentHistoryAction: string | null;
  nextRedoHistoryAction: string | null;
  onUndo: () => void;
  onRedo: () => void;
}

function isEntityHistoryAction(action: string | null): boolean {
  return typeof action === "string" && action.startsWith("viewer-region-entity-");
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (
    target instanceof HTMLInputElement &&
    !target.readOnly &&
    !target.disabled &&
    target.type !== "button" &&
    target.type !== "checkbox" &&
    target.type !== "color" &&
    target.type !== "file" &&
    target.type !== "hidden" &&
    target.type !== "image" &&
    target.type !== "radio" &&
    target.type !== "range" &&
    target.type !== "reset" &&
    target.type !== "submit"
  ) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement && !target.readOnly && !target.disabled) {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"]'));
}

export function useOverlayHistoryShortcuts({
  canUndo,
  canRedo,
  currentHistoryAction,
  nextRedoHistoryAction,
  onUndo,
  onRedo
}: UseOverlayHistoryShortcutsOptions): void {
  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }

      const commandKey = event.ctrlKey || event.metaKey;
      if (!commandKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = key === "y" || (key === "z" && event.shiftKey);
      const allowInEditableTarget =
        (wantsUndo && isEntityHistoryAction(currentHistoryAction)) ||
        (wantsRedo && isEntityHistoryAction(nextRedoHistoryAction));

      if (isEditableKeyboardTarget(event.target) && !allowInEditableTarget) {
        return;
      }

      if (wantsUndo && canUndo) {
        event.preventDefault();
        onUndo();
        return;
      }

      if (wantsRedo && canRedo) {
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [canRedo, canUndo, currentHistoryAction, nextRedoHistoryAction, onRedo, onUndo]);
}
