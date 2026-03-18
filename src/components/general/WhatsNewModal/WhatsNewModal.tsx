import { memo } from "react";
import styles from "./WhatsNewModal.module.css";
import type { WhatsNewModalProps } from "./WhatsNewModal.types";

function WhatsNewModalComponent({ isOpen, appMeta, onClose }: WhatsNewModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="whats-new-title">What&apos;s New</h2>
          <button
            type="button"
            className={styles.dialogCloseButton}
            onClick={onClose}
            aria-label="Close what's new dialog"
          >
            <span className={styles.dialogCloseGlyph} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.releaseList}>
          {appMeta.releaseNotes.map((release) => {
            const isCurrent = release.version === appMeta.version;
            return (
              <section className={styles.releaseCard} key={`${release.version}-${release.date}`}>
                <div className={styles.releaseHeadline}>
                  <span className={styles.versionPill}>v{release.version}</span>
                  {isCurrent && <span className={styles.currentPill}>Current</span>}
                  <span className={styles.releaseDate}>{release.date}</span>
                </div>
                <ul className={styles.releaseHighlights}>
                  {release.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const WhatsNewModal = memo(WhatsNewModalComponent);
