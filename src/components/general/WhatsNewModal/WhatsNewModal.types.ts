import type { AppMeta } from "../../../types/appMeta";

export interface WhatsNewModalProps {
  isOpen: boolean;
  appMeta: AppMeta;
  onClose: () => void;
}
