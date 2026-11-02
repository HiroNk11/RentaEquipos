import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  CircleHelp,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  RefreshCw,
  Users,
  Wrench,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useRental } from "./context/useRental";
import { useSession } from "./context/useSession";
import { useUI } from "./context/useUI";
import { useNotify } from "./context/useNotify";
import { initials } from "./lib/format";
import {
  Dashboard,
  Equipos,
  Reservas,
  Clientes,
  Disponibilidad,
} from "./Pages";
import { ModalHost } from "./components/ModalHost";
import { PageSkeleton } from "./components/Skeleton";
const navigation = [
  { to: "/", label: "Resumen", icon: LayoutDashboard },
  { to: "/equipos", label: "Equipos", icon: Wrench },
  { to: "/disponibilidad", label: "Disponibilidad", icon: CalendarCheck2 },
  { to: "/reservas", label: "Reservas", icon: CalendarDays },
  { to: "/clientes", label: "Clientes", icon: Users },
];
export default function App() {
  const rental = useRental(),
    session = useSession(),
    ui = useUI(),
    notify = useNotify(),
    location = useLocation();
  const [mobile, setMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    document.title =
      (navigation.find((n) => n.to === location.pathname)?.label ||
        "Mi espacio") + " · RentaEquipos";
  }, [location.pathname]);
  useEffect(() => {
    if (!mobile) return;
    const sidebar = sidebarRef.current!;
    const menuButton = menuRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>("a[href],button:not(:disabled)"),
      ).filter((element) => element.getClientRects().length > 0);
    focusables()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
      if (e.key === "Tab") {
        const elements = focusables(),
          first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const close = () => setMobile(false);
    const resize = () => {
      if (window.innerWidth > 1024) close();
    };
    window.addEventListener("keydown", handle);
    window.addEventListener("popstate", close);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("keydown", handle);
      window.removeEventListener("popstate", close);
      window.removeEventListener("resize", resize);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobile]);
  const authAction = async (logout = false) => {
    try {
      await (logout ? session.logout() : session.login());
    } catch {
      notify("No se pudo completar la operación de sesión.", true);
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Ir al contenido
      </a>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={"sidebar " + (mobile ? "is-open" : "")}
        aria-label="Navegación principal"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a[href],button"))
            setMobile(false);
        }}
      >
        <NavLink className="brand" to="/">
          <span className="brand-symbol">
            <Wrench size={22} />
          </span>
          <span>
            Renta<span>Equipos</span>
            <small>GESTIÓN DE ALQUILERES</small>
          </span>
        </NavLink>
        <button
          className="icon-button mobile-close"
          aria-label="Cerrar menú"
          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">MI ESPACIO</div>
        <nav>
          {navigation.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"}>
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.to === "/reservas" &&
                rental.data.reservas.some((r) => r.estado === "Pendiente") && (
                  <span className="nav-count">
                    {
                      rental.data.reservas.filter(
                        (r) => r.estado === "Pendiente",
                      ).length
                    }
                  </span>
                )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="connection-button"
            disabled={!!rental.busy}
            onClick={() => ui.open({ type: "connection" })}
          >
            <span
              className={
                "connection-dot " +
                (rental.mode === "demo"
                  ? "demo"
                  : rental.error
                    ? "offline"
                    : "")
              }
            />
            <span>
              {rental.mode === "demo" ? "Demostración" : "Conexión API"}
              <small>
                {rental.mode === "demo"
                  ? "Datos ficticios"
                  : session.authenticated
                    ? "Sesión autenticada"
                    : "Espacio de trabajo"}
              </small>
            </span>
            <ChevronDown size={15} />
          </button>
          {rental.mode === "demo" && (
            <button
              className="sidebar-secondary"
              disabled={!!rental.busy}
              onClick={() => ui.open({ type: "resetDemo" })}
            >
              <RefreshCw size={16} />
              Restablecer datos
            </button>
          )}
          <div className="sidebar-signature">
            RentaEquipos <span>Web</span>
          </div>
        </div>
      </aside>
      <div className="workspace" inert={mobile}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button menu-toggle"
              ref={menuRef}
              title="Abrir menú"
              aria-label="Abrir menú"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <NavLink to="/" className="mobile-brand">
              RentaEquipos
            </NavLink>
            <span>Mi espacio</span>
            <span className="breadcrumb-separator">/</span>
            <strong>
              {navigation.find((n) => n.to === location.pathname)?.label ||
                "Resumen"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="header-date">
              {new Intl.DateTimeFormat("es-AR", {
                day: "numeric",
                month: "long",
              }).format(new Date())}
            </span>
            <button
              className="icon-button"
              title="Actualizar datos"
              aria-label="Actualizar datos"
              disabled={rental.loading || !!rental.busy}
              onClick={rental.reload}
            >
              <RefreshCw size={17} />
            </button>
            <button
              className="icon-button help-button"
              title="Espacio de trabajo"
              aria-label="Espacio de trabajo"
              onClick={() => ui.open({ type: "connection" })}
            >
              <CircleHelp size={18} />
            </button>
            <span className="header-divider" />
            <div className="profile">
              <span className="avatar">
                {initials(rental.mode === "demo" ? "Modo Demo" : session.name)}
              </span>
              <span>
                {rental.mode === "demo" ? "Modo demo" : session.name}
                <small>
                  {rental.mode === "demo"
                    ? "Vista de demostración"
                    : session.roles.join(" · ") || "Sin sesión"}
                </small>
              </span>
            </div>
            {rental.mode === "api" && session.configured && (
              <button
                className="icon-button"
                title={
                  session.authenticated
                    ? session.windowsLocal
                      ? "Ocultar datos"
                      : "Cerrar sesión"
                    : "Iniciar sesión"
                }
                aria-label={
                  session.authenticated
                    ? session.windowsLocal
                      ? "Ocultar datos"
                      : "Cerrar sesión"
                    : "Iniciar sesión"
                }
                onClick={() => void authAction(session.authenticated)}
              >
                {session.authenticated ? (
                  <LogOut size={18} />
                ) : (
                  <LogIn size={18} />
                )}
              </button>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="content-width">
            {rental.mode === "demo" && (
              <div className="demo-banner">
                <span>
                  <i />
                  Demostración{" "}
                  <span className="demo-description">
                    · Los datos de esta vista son ficticios.
                  </span>
                </span>
                <button
                  disabled={!!rental.busy}
                  onClick={() => ui.open({ type: "connection" })}
                >
                  Cambiar espacio
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            {rental.mode === "api" && session.anonymous && (
              <div className="warning-banner">
                Desarrollo sin autenticación. No usar con datos reales.
              </div>
            )}
            {rental.data.partial && (
              <div className="warning-banner">
                Vista parcial: se alcanzó el límite de 500 registros por
                recurso.
              </div>
            )}
            {session.error && (
              <div className="error-banner" role="alert">
                {session.error}
              </div>
            )}
            {rental.error ? (
              <div className="connection-empty" role="alert">
                <AlertCircle size={36} />
                <h1>
                  {session.configured && !session.authenticated
                    ? "Tu espacio te espera"
                    : "No pudimos cargar el espacio"}
                </h1>
                <p>{rental.error}</p>
                <div className="detail-actions">
                  {session.configured && !session.authenticated ? (
                    <button
                      className="button primary"
                      onClick={() => void authAction()}
                    >
                      Iniciar sesión
                    </button>
                  ) : (
                    <button className="button primary" onClick={rental.reload}>
                      Reintentar
                    </button>
                  )}
                  <button
                    className="button"
                    onClick={() => rental.switchMode("demo")}
                  >
                    Ver demostración
                  </button>
                </div>
              </div>
            ) : rental.loading ? (
              <PageSkeleton path={location.pathname} />
            ) : (
              <Routes key={rental.mode}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/equipos" element={<Equipos />} />
                <Route path="/disponibilidad" element={<Disponibilidad />} />
                <Route path="/reservas" element={<Reservas />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
            <footer className="page-footer">
              <span>RentaEquipos</span>
              <span>Gestión de alquileres</span>
            </footer>
          </div>
        </main>
      </div>
      <ModalHost />
    </div>
  );
}
