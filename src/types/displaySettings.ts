export const FONT_SIZE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type FontSizeOption = (typeof FONT_SIZE_OPTIONS)[number];

export interface DisplaySettings {
  fontSize: FontSizeOption;
}
