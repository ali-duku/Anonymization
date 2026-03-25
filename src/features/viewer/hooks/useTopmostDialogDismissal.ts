import { useEffect, type RefObject } from "react";

interface UseTopmostDialogDismissalOptions {
  isParentOpen: boolean;
  isSpanEditorOpen: boolean;
  isPickerOpen: boolean;
  spanEditorRef: RefObject<HTMLElement>;
  pickerRef: RefObject<HTMLElement>;
  onDismissSpanEditor: () => void;
  onDismissPicker: () => void;
  onDismissParent: () => void;
}

export function useTopmostDialogDismissal({
  isParentOpen,
  isSpanEditorOpen,
  isPickerOpen,
  spanEditorRef,
  pickerRef,
  onDismissSpanEditor,
  onDismissPicker,
  onDismissParent
}: UseTopmostDialogDismissalOptions): void {
  useEffect(() => {
    if (!isParentOpen) {
      return;
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();

      if (isSpanEditorOpen) {
        onDismissSpanEditor();
        return;
      }

      if (isPickerOpen) {
        onDismissPicker();
        return;
      }

      onDismissParent();
    };

    window.addEventListener("keydown", onWindowKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, true);
    };
  }, [
    isParentOpen,
    isPickerOpen,
    isSpanEditorOpen,
    onDismissParent,
    onDismissPicker,
    onDismissSpanEditor
  ]);

  useEffect(() => {
    if (!isParentOpen || (!isSpanEditorOpen && !isPickerOpen)) {
      return;
    }

    const onWindowPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (isSpanEditorOpen) {
        const spanEditorElement = spanEditorRef.current;
        if (spanEditorElement && !spanEditorElement.contains(target)) {
          onDismissSpanEditor();
        }
        return;
      }

      if (isPickerOpen) {
        const pickerElement = pickerRef.current;
        if (pickerElement && !pickerElement.contains(target)) {
          onDismissPicker();
        }
      }
    };

    window.addEventListener("pointerdown", onWindowPointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", onWindowPointerDown, true);
    };
  }, [
    isParentOpen,
    isPickerOpen,
    isSpanEditorOpen,
    onDismissPicker,
    onDismissSpanEditor,
    pickerRef,
    spanEditorRef
  ]);
}

