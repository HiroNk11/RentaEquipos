import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  Wrench,
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import type { Equipo } from "../domain/types";
import { statusLabel } from "../lib/format";
export function Badge({ value }: { value: string }) {
  return (
    <span className={"status status-" + value.toLowerCase()}>
      <i />
      {statusLabel[value] || value}
    </span>
  );
}
export function ToolImage({
  equipo,
  small = false,
}: {
  equipo?: Equipo;
  small?: boolean;
}) {
  const index = equipo?.demoImage;
  return (
    <div
      className={"tool-image" + (small ? " small" : "")}
      title={
        index !== undefined
          ? "Ilustración referencial de demostración"
          : "Equipo sin fotografía"
      }
      role={index === undefined ? "img" : undefined}
      aria-label={
        index === undefined
          ? `Sin fotografía de ${equipo?.nombre || "equipo"}`
          : undefined
      }
    >
      {index !== undefined ? (
        <div
          className="atlas-tool"
          role="img"
          aria-label={"Ilustración referencial de " + equipo?.nombre}
          style={{
            backgroundImage: "url(/images/equipos-demo.webp)",
            backgroundPosition:
              (index % 3) * 50 + "% " + Math.floor(index / 3) * 100 + "%",
          }}
        />
      ) : (
        <Wrench size={small ? 22 : 48} strokeWidth={1.3} />
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  footer,
  onClose,
  busy = false,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  busy?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    if (!dialog.open) dialog.showModal();
    dialog
      .querySelector<HTMLElement>(
        "form input:not(:disabled),form select:not(:disabled)",
      )
      ?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={drawer ? "dialog drawer" : "dialog"}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="dialog-shell">
        <header className="dialog-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            title="Cerrar"
            aria-label="Cerrar"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="dialog-content">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </dialog>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-box">
      <Search size={18} />
      <input
        aria-label={placeholder}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
export function Empty({
  title,
  text,
  action,
  icon = <Inbox size={32} strokeWidth={1.4} />,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function FormError({ message }: { message: string }) {
  return message ? (
    <div className="form-error" role="alert">
      {message}
    </div>
  ) : null;
}
export function Submit({
  busy,
  children = "Guardar",
}: {
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="submit"
      className="button primary"
      disabled={busy}
      aria-busy={busy}
    >
      <span className={busy ? "submit-label pending" : "submit-label"}>
        {children}
      </span>
      {busy && <span className="sr-only">Guardando...</span>}
    </button>
  );
}
export function Pager({
  page,
  count,
  size = 9,
  onChange,
}: {
  page: number;
  count: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <div className="pagination">
      <span>
        {count === 0
          ? "0 registros"
          : (page - 1) * size +
            1 +
            "–" +
            Math.min(page * size, count) +
            " de " +
            count}
      </span>
      <div>
        <button
          className="icon-button"
          title="Página anterior"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          className="icon-button"
          title="Página siguiente"
          aria-label="Página siguiente"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
