export interface ViewerEditCapabilities {
  isBboxStructuralEditingEnabled: boolean;
  isRawTextEditingEnabled: boolean;
  isTextCopyEnabled: boolean;
}

export function resolveViewerEditCapabilities(
  isBboxStructuralEditingEnabled: boolean
): ViewerEditCapabilities {
  return {
    isBboxStructuralEditingEnabled,
    isRawTextEditingEnabled: isBboxStructuralEditingEnabled,
    isTextCopyEnabled: isBboxStructuralEditingEnabled
  };
}
