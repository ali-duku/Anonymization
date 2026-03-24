import type { DisplaySettings, FontSizeOption } from "../../../types/displaySettings";

export const DISPLAY_SETTINGS_STORAGE_KEY = "anonymizer.displaySettings.v1";

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fontSize: 1
};

export const FONT_SIZE_SCALE_BY_OPTION: Record<FontSizeOption, number> = {
  0.5: 0.5,
  0.75: 0.75,
  1: 1,
  1.25: 1.25,
  1.5: 1.5,
  1.75: 1.75,
  2: 2
};
