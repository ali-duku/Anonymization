import { memo } from "react";
import styles from "./SetupStatusRegion.module.css";
import type { SetupStatusRegionProps } from "./SetupStatusRegion.types";

function SetupStatusRegionComponent({ successText, errorText }: SetupStatusRegionProps) {
  return (
    <div className={styles.statusRegion}>
      {errorText ? (
        <p className={`${styles.statusLine} ${styles.statusLineError}`} role="alert">
          {errorText}
        </p>
      ) : successText ? (
        <p className={`${styles.statusLine} ${styles.statusLineSuccess}`} role="status">
          {successText}
        </p>
      ) : (
        <p className={`${styles.statusLine} ${styles.statusLinePlaceholder}`} aria-hidden="true">
          &nbsp;
        </p>
      )}
    </div>
  );
}

export const SetupStatusRegion = memo(SetupStatusRegionComponent);
