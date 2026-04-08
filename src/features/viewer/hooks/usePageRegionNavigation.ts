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
  totalRegions: number;
  hasPreviousRegion: boolean;
  hasNextRegion: boolean;
  hasFirstRegion: boolean;
  hasLastRegion: boolean;
  goFirstRegion: () => void;
  goLastRegion: () => void;
  goPreviousRegion: () => void;
  goNextRegion: () => void;
  goRegionByOrder: (order: number) => void;
  goNextRegionAfterSave: () => void;
}

export function usePageRegionNavigation({
  regions,
  activeRegionId,
  hasDialogChanges,
  onOpenRegionEditor
}: UsePageRegionNavigationOptions): UsePageRegionNavigationResult {
  const totalRegions = regions.length;

  const activeRegionIndex = useMemo(() => {
    if (!activeRegionId) {
      return -1;
    }
    return regions.findIndex((region) => region.id === activeRegionId);
  }, [activeRegionId, regions]);

  const hasPreviousRegion = activeRegionIndex > 0;
  const hasNextRegion = activeRegionIndex >= 0 && activeRegionIndex < totalRegions - 1;
  const hasFirstRegion = activeRegionIndex > 0;
  const hasLastRegion = activeRegionIndex >= 0 && activeRegionIndex < totalRegions - 1;

  const navigateToRegionIndex = useCallback(
    (targetIndex: number, options?: { skipUnsavedChangesGuard?: boolean }) => {
      if (activeRegionIndex < 0) {
        return;
      }

      if (targetIndex < 0 || targetIndex >= totalRegions || targetIndex === activeRegionIndex) {
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

      const targetRegion = regions[targetIndex];
      if (!targetRegion) {
        return;
      }

      onOpenRegionEditor(targetRegion);
    },
    [activeRegionIndex, hasDialogChanges, onOpenRegionEditor, regions, totalRegions]
  );

  const goFirstRegion = useCallback(() => {
    navigateToRegionIndex(0);
  }, [navigateToRegionIndex]);

  const goLastRegion = useCallback(() => {
    navigateToRegionIndex(totalRegions - 1);
  }, [navigateToRegionIndex, totalRegions]);

  const goPreviousRegion = useCallback(() => {
    navigateToRegionIndex(activeRegionIndex - 1);
  }, [activeRegionIndex, navigateToRegionIndex]);

  const goNextRegion = useCallback(() => {
    navigateToRegionIndex(activeRegionIndex + 1);
  }, [activeRegionIndex, navigateToRegionIndex]);

  const goRegionByOrder = useCallback(
    (order: number) => {
      if (!Number.isFinite(order)) {
        return;
      }
      const nextIndex = Math.trunc(order) - 1;
      navigateToRegionIndex(nextIndex);
    },
    [navigateToRegionIndex]
  );

  const goNextRegionAfterSave = useCallback(() => {
    navigateToRegionIndex(activeRegionIndex + 1, { skipUnsavedChangesGuard: true });
  }, [activeRegionIndex, navigateToRegionIndex]);

  return {
    activeRegionIndex,
    totalRegions,
    hasPreviousRegion,
    hasNextRegion,
    hasFirstRegion,
    hasLastRegion,
    goFirstRegion,
    goLastRegion,
    goPreviousRegion,
    goNextRegion,
    goRegionByOrder,
    goNextRegionAfterSave
  };
}
