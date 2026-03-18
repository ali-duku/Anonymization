import type { AppMeta } from "../../../types/appMeta";
import type { AppTab } from "../TabNav/TabNav.types";

export interface HeaderProps {
  appMeta: AppMeta;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onGenerateJson?: () => void;
  onManualSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canManualSave?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}
