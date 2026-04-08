interface EntityColorVariant {
  saturation: number;
  fillLightness: number;
  borderLightness: number;
  chipLightness: number;
  chipAlpha: number;
  fillMatchedAlpha: number;
  fillUnmatchedAlpha: number;
  buttonSaturation: number;
  buttonLightness: number;
}

export interface CanonicalEntityColorPalette {
  border: string;
  fillMatched: string;
  fillUnmatched: string;
  chipBackground: string;
  chipText: string;
  buttonBackground: string;
  buttonText: string;
}

const HUE_SLOT_COUNT = 34;
const HUE_CYCLE_ROTATION_STEP = 3;
const HUE_OFFSET_DEGREES = 4;

/**
 * Canonical hue-slot walk optimized for strong early separation.
 * The first assignments intentionally jump across the wheel instead of
 * visiting neighboring hues, improving at-a-glance distinguishability.
 */
const HUE_SLOT_ORDER: readonly number[] = [
  0, 17, 8, 25, 4, 21, 29, 12, 2, 6, 10, 14, 19, 23, 27, 31, 1,
  3, 5, 7, 9, 11, 13, 15, 16, 18, 20, 22, 24, 26, 28, 30, 32, 33
];

const ENTITY_COLOR_VARIANTS: readonly EntityColorVariant[] = [
  {
    saturation: 90,
    fillLightness: 52,
    borderLightness: 66,
    chipLightness: 46,
    chipAlpha: 0.46,
    fillMatchedAlpha: 0.28,
    fillUnmatchedAlpha: 0.14,
    buttonSaturation: 94,
    buttonLightness: 58
  },
  {
    saturation: 94,
    fillLightness: 44,
    borderLightness: 72,
    chipLightness: 40,
    chipAlpha: 0.52,
    fillMatchedAlpha: 0.34,
    fillUnmatchedAlpha: 0.18,
    buttonSaturation: 96,
    buttonLightness: 54
  }
];

const DEFAULT_CHIP_TEXT = "#f7fbff";
const DEFAULT_BUTTON_TEXT = "#08111a";

export const FALLBACK_CANONICAL_ENTITY_PALETTE: CanonicalEntityColorPalette = {
  border: "rgba(156, 180, 204, 0.96)",
  fillMatched: "rgba(125, 149, 173, 0.26)",
  fillUnmatched: "rgba(125, 149, 173, 0.12)",
  chipBackground: "rgba(125, 149, 173, 0.34)",
  chipText: DEFAULT_CHIP_TEXT,
  buttonBackground: "rgba(157, 185, 211, 0.97)",
  buttonText: DEFAULT_BUTTON_TEXT
};

function formatHsl(hue: number, saturation: number, lightness: number, alpha?: number): string {
  if (alpha === undefined) {
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }
  return `hsl(${hue} ${saturation}% ${lightness}% / ${alpha})`;
}

function resolveHueAndVariant(index: number): { hue: number; variant: EntityColorVariant } {
  const safeIndex = Math.max(0, Math.floor(index));
  const cycle = Math.floor(safeIndex / HUE_SLOT_COUNT);
  const variant = ENTITY_COLOR_VARIANTS[cycle % ENTITY_COLOR_VARIANTS.length];
  const withinCycleIndex = safeIndex % HUE_SLOT_COUNT;
  const cycleRotation = (cycle * HUE_CYCLE_ROTATION_STEP) % HUE_SLOT_COUNT;
  const slotIndex = (withinCycleIndex + cycleRotation) % HUE_SLOT_COUNT;
  const hueSlot = HUE_SLOT_ORDER[slotIndex] ?? 0;
  const hue = ((hueSlot * 360) / HUE_SLOT_COUNT + HUE_OFFSET_DEGREES) % 360;
  return { hue, variant };
}

export function buildCanonicalEntityColorPalette(
  colorIndex: number
): CanonicalEntityColorPalette {
  if (!Number.isFinite(colorIndex) || colorIndex < 0) {
    return FALLBACK_CANONICAL_ENTITY_PALETTE;
  }

  const { hue, variant } = resolveHueAndVariant(colorIndex);

  return {
    border: formatHsl(hue, variant.saturation, variant.borderLightness, 0.98),
    fillMatched: formatHsl(hue, variant.saturation, variant.fillLightness, variant.fillMatchedAlpha),
    fillUnmatched: formatHsl(hue, variant.saturation, variant.fillLightness, variant.fillUnmatchedAlpha),
    chipBackground: formatHsl(hue, variant.saturation, variant.chipLightness, variant.chipAlpha),
    chipText: DEFAULT_CHIP_TEXT,
    buttonBackground: formatHsl(hue, variant.buttonSaturation, variant.buttonLightness, 0.97),
    buttonText: DEFAULT_BUTTON_TEXT
  };
}
