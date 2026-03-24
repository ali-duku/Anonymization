import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_STORAGE_KEY,
  FONT_SIZE_SCALE_BY_OPTION
} from "../constants/displaySettings";
import { FONT_SIZE_OPTIONS, type DisplaySettings, type FontSizeOption } from "../../../types/displaySettings";

interface DisplaySettingsContextValue {
  settings: DisplaySettings;
  setFontSize: (fontSize: FontSizeOption) => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null);

function isFontSizeOption(value: unknown): value is FontSizeOption {
  return typeof value === "number" && FONT_SIZE_OPTIONS.includes(value as FontSizeOption);
}

function readPersistedDisplaySettings(): DisplaySettings {
  if (typeof window === "undefined") {
    return DEFAULT_DISPLAY_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(DISPLAY_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DISPLAY_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
    if (!isFontSizeOption(parsed.fontSize)) {
      return DEFAULT_DISPLAY_SETTINGS;
    }

    return { fontSize: parsed.fontSize };
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

export function DisplaySettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<DisplaySettings>(() => readPersistedDisplaySettings());

  const setFontSize = useCallback((fontSize: FontSizeOption) => {
    setSettings((previous) => {
      if (previous.fontSize === fontSize) {
        return previous;
      }
      return {
        ...previous,
        fontSize
      };
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DISPLAY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage write failures.
    }
  }, [settings]);

  useEffect(() => {
    const scale = FONT_SIZE_SCALE_BY_OPTION[settings.fontSize];
    document.documentElement.style.setProperty("--app-font-size-scale", String(scale));
    document.documentElement.dataset.appFontSize = String(settings.fontSize);
  }, [settings.fontSize]);

  const value = useMemo<DisplaySettingsContextValue>(
    () => ({
      settings,
      setFontSize
    }),
    [settings, setFontSize]
  );

  return <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>;
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error("useDisplaySettings must be used within DisplaySettingsProvider");
  }
  return context;
}
