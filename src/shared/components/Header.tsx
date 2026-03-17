import { useState } from "react";
import type { AppMeta } from "../../types/appMeta";
import { TabNav, type AppTab } from "./TabNav";
import { WhatsNewModal } from "./WhatsNewModal";

interface HeaderProps {
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

export function Header({
  appMeta,
  activeTab,
  onTabChange,
  onGenerateJson,
  onManualSave,
  onUndo,
  onRedo,
  canManualSave = false,
  canUndo = false,
  canRedo = false
}: HeaderProps) {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="identity-block">
          <h1>{appMeta.name}</h1>
        </div>

        <TabNav activeTab={activeTab} onChange={onTabChange} />

        <div className="header-actions">
          <div className="header-history-actions">
            <button
              className="action-button"
              type="button"
              onClick={onGenerateJson}
              disabled={!onGenerateJson}
            >
              Generate JSON
            </button>
            <button
              className="action-button secondary"
              type="button"
              onClick={onManualSave}
              disabled={!onManualSave || !canManualSave}
            >
              Save
            </button>
            <button
              className="action-button secondary"
              type="button"
              onClick={onUndo}
              disabled={!onUndo || !canUndo}
            >
              Undo
            </button>
            <button
              className="action-button secondary"
              type="button"
              onClick={onRedo}
              disabled={!onRedo || !canRedo}
            >
              Redo
            </button>
          </div>
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
