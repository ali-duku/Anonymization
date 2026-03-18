export type AppTab = "viewer" | "setup";

export interface TabNavProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}
