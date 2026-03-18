import { memo } from "react";
import styles from "./TabNav.module.css";
import type { TabNavProps } from "./TabNav.types";

function TabNavComponent({ activeTab, onChange }: TabNavProps) {
  return (
    <nav className={styles.tabNav} aria-label="Main Tabs">
      <button
        type="button"
        className={`${styles.tabTrigger} ${activeTab === "viewer" ? styles.tabTriggerActive : ""}`}
        onClick={() => onChange("viewer")}
        aria-selected={activeTab === "viewer"}
      >
        Viewer
      </button>
      <button
        type="button"
        className={`${styles.tabTrigger} ${activeTab === "setup" ? styles.tabTriggerActive : ""}`}
        onClick={() => onChange("setup")}
        aria-selected={activeTab === "setup"}
      >
        Setup
      </button>
    </nav>
  );
}

export const TabNav = memo(TabNavComponent);
