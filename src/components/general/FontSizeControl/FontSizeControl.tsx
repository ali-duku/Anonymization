import { memo } from "react";
import styles from "./FontSizeControl.module.css";
import type { FontSizeControlProps } from "./FontSizeControl.types";
import { FONT_SIZE_OPTIONS, type FontSizeOption } from "../../../types/displaySettings";

function formatFontSizeOption(option: FontSizeOption): string {
  const normalized = Number.isInteger(option) ? option.toFixed(0) : option.toFixed(2).replace(/0$/, "");
  return `${normalized}x`;
}

function FontSizeControlComponent({ value, onChange }: FontSizeControlProps) {
  return (
    <div className={styles.fontSizeControl}>
      <label className={styles.label} htmlFor="global-font-size-select">
        Font size
      </label>
      <select
        id="global-font-size-select"
        className={styles.select}
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value) as FontSizeOption)}
      >
        {FONT_SIZE_OPTIONS.map((option) => (
          <option key={option} value={String(option)}>
            {formatFontSizeOption(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

export const FontSizeControl = memo(FontSizeControlComponent);
