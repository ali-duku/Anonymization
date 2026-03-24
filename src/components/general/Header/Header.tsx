import { Suspense, lazy, memo, useState } from "react";
import { FontSizeControl } from "../FontSizeControl/FontSizeControl";
import { TabNav } from "../TabNav/TabNav";
import styles from "./Header.module.css";
import type { HeaderProps } from "./Header.types";

const LazyWhatsNewModal = lazy(async () => {
  const module = await import("../WhatsNewModal/WhatsNewModal");
  return { default: module.WhatsNewModal };
});

function HeaderComponent({
  appMeta,
  activeTab,
  onTabChange,
  onGenerateJson,
  onManualSave,
  onUndo,
  onRedo,
  fontSize,
  onFontSizeChange,
  canManualSave = false,
  canUndo = false,
  canRedo = false
}: HeaderProps) {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  return (
    <>
      <header className={styles.appHeader}>
        <div className={styles.identityBlock}>
          <h1>{appMeta.name}</h1>
        </div>

        <TabNav activeTab={activeTab} onChange={onTabChange} />

        <div className={styles.headerActions}>
          <div className={styles.headerHistoryActions}>
            <button
              className={styles.actionButton}
              type="button"
              onClick={onGenerateJson}
              disabled={!onGenerateJson}
            >
              Generate JSON
            </button>
            <button
              className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
              type="button"
              onClick={onManualSave}
              disabled={!onManualSave || !canManualSave}
            >
              Save
            </button>
            <button
              className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
              type="button"
              onClick={onUndo}
              disabled={!onUndo || !canUndo}
            >
              Undo
            </button>
            <button
              className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
              type="button"
              onClick={onRedo}
              disabled={!onRedo || !canRedo}
            >
              Redo
            </button>
          </div>
          <FontSizeControl value={fontSize} onChange={onFontSizeChange} />
          <span className={styles.versionBadge} aria-label={`Version ${appMeta.version}`}>
            Version {appMeta.version}
          </span>
          <button className={styles.actionButton} type="button" onClick={() => setIsWhatsNewOpen(true)}>
            What&apos;s New
          </button>
        </div>
      </header>

      <Suspense fallback={null}>
        <LazyWhatsNewModal
          isOpen={isWhatsNewOpen}
          appMeta={appMeta}
          onClose={() => setIsWhatsNewOpen(false)}
        />
      </Suspense>
    </>
  );
}

export const Header = memo(HeaderComponent);
