import type { AppMeta } from "../../../types/appMeta";
import type { AppTab } from "../TabNav/TabNav.types";
import type { FontSizeOption } from "../../../types/displaySettings";

export interface HeaderProps {
  appMeta: AppMeta;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onGenerateJson?: () => void;
  onManualSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  fontSize: FontSizeOption;
  onFontSizeChange: (fontSize: FontSizeOption) => void;
  canManualSave?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}
