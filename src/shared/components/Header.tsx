import { useState } from "react";
import type { AppMeta } from "../../types/appMeta";
import { TabNav, type AppTab } from "./TabNav";
import { WhatsNewModal } from "./WhatsNewModal";

interface HeaderProps {
  appMeta: AppMeta;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export function Header({ appMeta, activeTab, onTabChange }: HeaderProps) {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="identity-block">
          <h1>{appMeta.name}</h1>
        </div>

        <TabNav activeTab={activeTab} onChange={onTabChange} />

        <div className="header-actions">
          <span className="version-badge" aria-label={`Version ${appMeta.version}`}>
            Version {appMeta.version}
          </span>
          <button className="action-button" type="button" onClick={() => setIsWhatsNewOpen(true)}>
            What&apos;s New
          </button>
        </div>
      </header>

      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        appMeta={appMeta}
        onClose={() => setIsWhatsNewOpen(false)}
      />
    </>
  );
}
