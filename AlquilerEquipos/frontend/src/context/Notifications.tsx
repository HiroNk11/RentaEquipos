import { useState, type ReactNode } from "react";
import { NotificationContext as Context } from "./useNotify";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
type Notice = { id: number; message: string; error: boolean };
export function Notifications({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notice[]>([]);
  const notify = (message: string, error = false) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current.slice(-2), { id, message, error }]);
    window.setTimeout(
      () => setItems((current) => current.filter((item) => item.id !== id)),
      error ? 9000 : 5000,
    );
  };
  return (
    <Context.Provider value={notify}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div
            className={"toast " + (item.error ? "toast-error" : "")}
            key={item.id}
          >
            {item.error ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}
            <span>{item.message}</span>
            <button
              className="icon-button"
              aria-label="Cerrar aviso"
              title="Cerrar aviso"
              onClick={() =>
                setItems((current) =>
                  current.filter((notice) => notice.id !== item.id),
                )
              }
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
