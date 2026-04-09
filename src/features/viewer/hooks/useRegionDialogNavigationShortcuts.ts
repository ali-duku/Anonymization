import { useEffect } from "react";

interface UseRegionDialogNavigationShortcutsOptions {
  isDialogOpen: boolean;
  isPopoverOpen: boolean;
  onGoFirstRegion: () => void;
  onGoLastRegion: () => void;
  onGoPreviousRegion: () => void;
  onGoNextRegion: () => void;
}

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit"
]);

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target instanceof HTMLInputElement) {
    if (target.disabled || target.readOnly) {
      return false;
    }
    return !NON_TEXT_INPUT_TYPES.has(target.type);
  }

  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly;
  }

  if (target instanceof HTMLSelectElement) {
    return !target.disabled;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  if (target.closest('[contenteditable="true"]')) {
    return true;
  }

  return Boolean(
    target.closest('[role="textbox"],[role="combobox"],[role="searchbox"],[role="spinbutton"]')
  );
}

export function useRegionDialogNavigationShortcuts({
  isDialogOpen,
  isPopoverOpen,
  onGoFirstRegion,
  onGoLastRegion,
  onGoPreviousRegion,
  onGoNextRegion
}: UseRegionDialogNavigationShortcutsOptions): void {
  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (isPopoverOpen) {
        return;
      }

      if (event.defaultPrevented || event.isComposing || event.repeat) {
        return;
      }

      if (event.altKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      event.preventDefault();

      if (event.ctrlKey) {
        if (event.key === "ArrowLeft") {
          onGoFirstRegion();
        } else {
          onGoLastRegion();
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        onGoPreviousRegion();
      } else {
        onGoNextRegion();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [
    isDialogOpen,
    isPopoverOpen,
    onGoFirstRegion,
    onGoLastRegion,
    onGoNextRegion,
    onGoPreviousRegion
  ]);
}
