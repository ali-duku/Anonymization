export interface SetupFooterActionsProps {
  hasInput: boolean;
  hasOutput: boolean;
  isCopying: boolean;
  loadStatusText: string;
  outputStats: string;
  onLoadToViewer: () => void;
  onCopy: () => void;
}
