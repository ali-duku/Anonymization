import type { FontSizeOption } from "../../../types/displaySettings";

export interface FontSizeControlProps {
  value: FontSizeOption;
  onChange: (next: FontSizeOption) => void;
}
