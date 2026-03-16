import type { AppMeta } from "../../types/appMeta";

interface WhatsNewModalProps {
  isOpen: boolean;
  appMeta: AppMeta;
  onClose: () => void;
}

export function WhatsNewModal({ isOpen, appMeta, onClose }: WhatsNewModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="whats-new-title">What&apos;s New</h2>
          <button
            type="button"
            className="ghost-button dialog-close-button"
            onClick={onClose}
            aria-label="Close what's new dialog"
          >
            <span className="dialog-close-glyph" aria-hidden="true" />
          </button>
        </div>

        <div className="release-list">
          {appMeta.releaseNotes.map((release) => {
            const isCurrent = release.version === appMeta.version;
            return (
              <section className="release-card" key={`${release.version}-${release.date}`}>
                <div className="release-headline">
                  <span className="version-pill">v{release.version}</span>
                  {isCurrent && <span className="current-pill">Current</span>}
                  <span className="release-date">{release.date}</span>
                </div>
                <ul className="release-highlights">
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
