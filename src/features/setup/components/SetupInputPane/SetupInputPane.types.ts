import type { ChangeEventHandler, RefObject } from "react";

export interface SetupInputPaneProps {
  textareaRef: RefObject<HTMLTextAreaElement>;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
}
