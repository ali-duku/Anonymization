import { useCallback, useMemo } from "react";
import type { OverlayRegion } from "../../../types/overlay";

interface UsePageRegionNavigationOptions {
  regions: OverlayRegion[];
  activeRegionId: string | undefined;
  hasDialogChanges: boolean;
  onOpenRegionEditor: (region: OverlayRegion) => void;
}

interface UsePageRegionNavigationResult {
  activeRegionIndex: number;
  hasPreviousRegion: boolean;
  hasNextRegion: boolean;
  goPreviousRegion: () => void;
  goNextRegion: () => void;
  goNextRegionAfterSave: () => void;
}

export function usePageRegionNavigation({
  regions,
  activeRegionId,
  hasDialogChanges,
  onOpenRegionEditor
}: UsePageRegionNavigationOptions): UsePageRegionNavigationResult {
  const activeRegionIndex = useMemo(() => {
    if (!activeRegionId) {
      return -1;
    }
    return regions.findIndex((region) => region.id === activeRegionId);
  }, [activeRegionId, regions]);

  const hasPreviousRegion = activeRegionIndex > 0;
  const hasNextRegion = activeRegionIndex >= 0 && activeRegionIndex < regions.length - 1;

  const navigateRegionByOffset = useCallback(
    (offset: number, options?: { skipUnsavedChangesGuard?: boolean }) => {
      if (activeRegionIndex < 0) {
        return;
      }

      const nextIndex = activeRegionIndex + offset;
      if (nextIndex < 0 || nextIndex >= regions.length) {
        return;
      }

      if (!options?.skipUnsavedChangesGuard && hasDialogChanges) {
        const shouldDiscard = window.confirm(
          "You have unsaved changes in this region. Discard them and navigate?"
        );
        if (!shouldDiscard) {
          return;
        }
      }

      const targetRegion = regions[nextIndex];
      if (!targetRegion) {
        return;
      }

      onOpenRegionEditor(targetRegion);
    },
    [activeRegionIndex, hasDialogChanges, onOpenRegionEditor, regions]
  );

  const goPreviousRegion = useCallback(() => {
    navigateRegionByOffset(-1);
  }, [navigateRegionByOffset]);

  const goNextRegion = useCallback(() => {
    navigateRegionByOffset(1);
  }, [navigateRegionByOffset]);

  const goNextRegionAfterSave = useCallback(() => {
    navigateRegionByOffset(1, { skipUnsavedChangesGuard: true });
  }, [navigateRegionByOffset]);

  return {
    activeRegionIndex,
    hasPreviousRegion,
    hasNextRegion,
    goPreviousRegion,
    goNextRegion,
    goNextRegionAfterSave
  };
}
