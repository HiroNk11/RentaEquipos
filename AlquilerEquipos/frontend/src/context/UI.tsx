import { useRef, useState, type ReactNode } from "react";
import { UIContext as Context, type ModalState } from "./useUI";
export function UIProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>();
  const trigger = useRef<HTMLElement | null>(null);
  const restoreFrame = useRef(0);
  function open(next: ModalState) {
    cancelAnimationFrame(restoreFrame.current);
    const active = document.activeElement;
    // Keep the original trigger when a detail opens a second dialog.
    if (active instanceof HTMLElement && !active.closest("dialog"))
      trigger.current = active;
    setModal(next);
  }
  function close() {
    setModal(undefined);
    restoreFrame.current = requestAnimationFrame(() => {
      const element = trigger.current;
      if (
        element?.isConnected &&
        element.getClientRects().length &&
        !element.closest("[inert]")
      )
        element.focus();
      else document.getElementById("main")?.focus();
    });
  }
  return (
    <Context.Provider value={{ modal, open, close }}>
      {children}
    </Context.Provider>
  );
}
