import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarCheck2,
  CalendarPlus,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Wrench,
  Users,
  Clock3,
  PackageCheck,
} from "lucide-react";
import { useRental } from "./context/useRental";
import { useUI } from "./context/useUI";
import {
  Badge,
  Empty,
  FormError,
  Pager,
  SearchBox,
  ToolImage,
} from "./components/ui";
import { ReservationTable } from "./components/ReservationTable";
import {
  dateTime,
  defaultPeriod,
  fullName,
  initials,
  normalize,
  sameDay,
} from "./lib/format";
import { errorMessage } from "./lib/api";
import type { Equipo } from "./domain/types";
import { useNow } from "./lib/useNow";
import { EquipmentSkeleton, LoadingRegion } from "./components/Skeleton";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow sr-only">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Dashboard() {
  const now = useNow();
  const { data, canWrite } = useRental(),
    { open } = useUI();
  const [tab, setTab] = useState("hoy");
  const active = data.reservas.filter((r) => r.estado === "Activa"),
    overdue = active.filter((r) => +new Date(r.fechaFinEsperada) < now);
  const today = data.reservas.filter(
    (r) =>
      ["Pendiente", "Activa"].includes(r.estado) &&
      (sameDay(r.fechaInicio, new Date()) ||
        sameDay(r.fechaFinEsperada, new Date())),
  );
  const items =
    tab === "hoy"
      ? today
      : tab === "curso"
        ? active
        : data.reservas.filter((r) => r.estado === "Pendiente");
  const stats = [
    {
      label: "Equipos disponibles",
      value: data.equipos.filter((e) => e.estado === "Disponible").length,
      caption: `${data.equipos.length} equipos en inventario`,
      icon: PackageCheck,
      color: "green",
    },
    {
      label: "Alquileres en curso",
      value: active.length,
      caption: overdue.length
        ? `${overdue.length} con devolución vencida`
        : "Sin devoluciones vencidas",
      icon: ArrowUpRight,
      color: "blue",
    },
    {
      label: "Reservas pendientes",
      value: data.reservas.filter((r) => r.estado === "Pendiente").length,
      caption: "Pendientes de retiro",
      icon: CalendarCheck2,
      color: "amber",
    },
    {
      label: "En mantenimiento",
      value: data.equipos.filter((e) => e.estado === "Mantenimiento").length,
      caption: "Fuera de disponibilidad",
      icon: Wrench,
      color: "gray",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="TU OPERACIÓN, AL DÍA"
        title="Resumen de operaciones"
        description={new Intl.DateTimeFormat("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(now))}
        action={
          canWrite && (
            <button
              className="button primary"
              disabled={!data.equipos.length || !data.clientes.length}
              onClick={() => open({ type: "reservaForm" })}
            >
              <Plus size={18} />
              Nueva reserva
            </button>
          )
        }
      />
      {canWrite && (!data.equipos.length || !data.clientes.length) && (
        <section className="initial-records" aria-label="Registros iniciales">
          {!data.equipos.length && (
            <div>
              <Wrench size={21} />
              <span>Inventario sin equipos</span>
              <button
                className="button"
                onClick={() => open({ type: "equipoForm" })}
              >
                <Plus size={16} />
                Agregar primer equipo
              </button>
            </div>
          )}
          {!data.clientes.length && (
            <div>
              <Users size={21} />
              <span>Sin clientes registrados</span>
              <button
                className="button"
                onClick={() => open({ type: "clienteForm" })}
              >
                <Plus size={16} />
                Registrar primer cliente
              </button>
            </div>
          )}
        </section>
      )}
      <div className="stats-grid">
        {stats.map((s) => (
          <article className="stat" key={s.label}>
            <div>
              <span>{s.label}</span>
              <s.icon className={"stat-icon " + s.color} size={19} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.caption}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="operations">
          <div className="section-title">
            <div>
              <h2>Agenda de alquileres</h2>
            </div>
            <Link className="text-button" to="/reservas">
              Ver todas
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="tabs">
            <button
              aria-pressed={tab === "hoy"}
              className={tab === "hoy" ? "selected" : ""}
              onClick={() => setTab("hoy")}
            >
              Hoy<span>{today.length}</span>
            </button>
            <button
              aria-pressed={tab === "curso"}
              className={tab === "curso" ? "selected" : ""}
              onClick={() => setTab("curso")}
            >
              En curso<span>{active.length}</span>
            </button>
            <button
              aria-pressed={tab === "pendientes"}
              className={tab === "pendientes" ? "selected" : ""}
              onClick={() => setTab("pendientes")}
            >
              Pendientes
            </button>
          </div>
          <ReservationTable items={items.slice(0, 6)} />
        </section>
        <aside className="daily-summary">
          <h2>Movimientos de hoy</h2>
          <div className="movement">
            <span className="movement-icon green">
              <ArrowUpRight size={20} />
            </span>
            <div>
              <strong>
                {
                  data.reservas.filter(
                    (r) =>
                      r.estado === "Pendiente" &&
                      sameDay(r.fechaInicio, new Date()),
                  ).length
                }{" "}
                retiros previstos
              </strong>
              <small>Reservas pendientes para hoy</small>
            </div>
          </div>
          <div className="movement">
            <span className="movement-icon blue">
              <ArrowDownLeft size={20} />
            </span>
            <div>
              <strong>
                {
                  active.filter((r) => sameDay(r.fechaFinEsperada, new Date()))
                    .length
                }{" "}
                devoluciones previstas
              </strong>
              <small>Equipos actualmente en alquiler</small>
            </div>
          </div>
          {overdue.length > 0 && (
            <div className="attention">
              <Clock3 size={18} />
              <div>
                <strong>Devoluciones vencidas</strong>
                <p>{overdue.length} alquileres superaron la fecha prevista.</p>
                <Link to="/reservas">
                  Revisar reservas
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          )}
          <div className="quick-links">
            <h3>Accesos rápidos</h3>
            <Link to="/disponibilidad">
              <CalendarCheck2 size={18} />
              Consultar disponibilidad
              <ChevronRight size={16} />
            </Link>
            <Link to="/clientes">
              <Users size={18} />
              Directorio de clientes
              <ChevronRight size={16} />
            </Link>
          </div>
        </aside>
      </div>
      <section className="inventory-preview">
        <div className="section-title">
          <div>
            <h2>Listos para salir</h2>
            <p>Consultá las fechas antes de reservar.</p>
          </div>
          <Link to="/equipos" className="text-button">
            Ver inventario
            <ChevronRight size={16} />
          </Link>
        </div>
        <div className="equipment-grid preview">
          {data.equipos
            .filter((e) => e.estado === "Disponible")
            .slice(0, 4)
            .map((e) => (
              <EquipmentCard key={e.id} equipo={e} />
            ))}
        </div>
        {!data.equipos.some((e) => e.estado === "Disponible") && (
          <Empty title="Sin equipos disponibles" />
        )}
      </section>
    </>
  );
}
export function EquipmentCard({
  equipo: e,
  period,
}: {
  equipo: Equipo;
  period?: { start: string; end: string };
}) {
  const { open } = useUI(),
    { canWrite } = useRental();
  return (
    <article className="equipment-card">
      <button
        className="equipment-visual"
        aria-label={`Ver ${e.nombre}`}
        onClick={() => open({ type: "equipoDetail", id: e.id })}
      >
        <ToolImage equipo={e} />
      </button>
      <div className="equipment-info">
        <div className="equipment-meta">
          <span>{e.marca}</span>
          <Badge value={e.estado} />
        </div>
        <button
          className="equipment-name"
          onClick={() => open({ type: "equipoDetail", id: e.id })}
        >
          {e.nombre}
        </button>
        <span className="serial">{e.numeroSerie}</span>
        <div className="equipment-footer">
          <button
            className="text-button"
            onClick={() => open({ type: "equipoDetail", id: e.id })}
          >
            Ver detalle
            <ArrowUpRight size={15} />
          </button>
          {canWrite && (
            <button
              className="icon-button reserve-button"
              title={`Reservar ${e.nombre}`}
              aria-label={`Reservar ${e.nombre}`}
              disabled={e.estado === "Mantenimiento"}
              onClick={() =>
                open({ type: "reservaForm", equipoId: e.id, ...period })
              }
            >
              <CalendarPlus size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
export function Equipos() {
  const { data, canWrite } = useRental(),
    { open } = useUI();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("Todos"),
    [view, setView] = useState("grid"),
    [page, setPage] = useState(1);
  const filtered = data.equipos.filter(
    (e) =>
      (status === "Todos" || e.estado === status) &&
      normalize(`${e.nombre} ${e.marca} ${e.numeroSerie}`).includes(
        normalize(search),
      ),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / 9))),
    items = filtered.slice((current - 1) * 9, current * 9);
  return (
    <>
      <PageHeading
        eyebrow="INVENTARIO"
        title="Equipos e inventario"
        description={`${data.equipos.length} equipos registrados en tu inventario.`}
        action={
          canWrite && (
            <button
              className="button primary"
              onClick={() => open({ type: "equipoForm" })}
            >
              <Plus size={18} />
              Nuevo equipo
            </button>
          )
        }
      />
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar equipo, marca o serie"
        />
        <label className="filter-select">
          <span>Estado</span>
          <select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option>Todos</option>
            <option value="Disponible">Disponible</option>
            <option value="EnUso">En alquiler</option>
            <option>Mantenimiento</option>
          </select>
        </label>
        <div className="view-toggle">
          <button
            className={view === "grid" ? "selected" : ""}
            title="Vista de tarjetas"
            aria-label="Vista de tarjetas"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={view === "list" ? "selected" : ""}
            title="Vista de lista"
            aria-label="Vista de lista"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={19} />
          </button>
        </div>
      </div>
      {!items.length ? (
        <Empty
          title="No encontramos equipos"
          text={
            data.equipos.length
              ? "Probá con otro nombre o estado."
              : "Todavía no hay equipos registrados."
          }
          action={
            canWrite && !data.equipos.length ? (
              <button
                className="button"
                onClick={() => open({ type: "equipoForm" })}
              >
                <Plus size={16} />
                Agregar equipo
              </button>
            ) : search || status !== "Todos" ? (
              <button
                className="button"
                onClick={() => {
                  setSearch("");
                  setStatus("Todos");
                  setPage(1);
                }}
              >
                Limpiar filtros
              </button>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <div className="equipment-grid">
          {items.map((e) => (
            <EquipmentCard equipo={e} key={e.id} />
          ))}
        </div>
      ) : (
        <div
          className="table-scroll responsive-table"
          tabIndex={0}
          role="region"
          aria-label="Listado de equipos"
        >
          <table>
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Marca</th>
                <th>Serie</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td data-label="Equipo">
                    <button
                      className="table-link"
                      onClick={() => open({ type: "equipoDetail", id: e.id })}
                    >
                      {e.nombre}
                    </button>
                  </td>
                  <td data-label="Marca">{e.marca}</td>
                  <td data-label="Serie">{e.numeroSerie}</td>
                  <td data-label="Estado">
                    <Badge value={e.estado} />
                  </td>
                  <td data-label="Acciones">
                    <button
                      className="icon-button"
                      title={`Ver ${e.nombre}`}
                      onClick={() => open({ type: "equipoDetail", id: e.id })}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={current} count={filtered.length} onChange={setPage} />
    </>
  );
}
export function Disponibilidad() {
  const rental = useRental();
  const initial = defaultPeriod();
  const [start, setStart] = useState(initial.start),
    [end, setEnd] = useState(initial.end),
    [result, setResult] = useState<{
      items: Equipo[];
      start: string;
      end: string;
    }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult(undefined);
    if (+new Date(end) <= +new Date(start)) {
      setError("La devolución debe ser posterior al retiro.");
      return;
    }
    setBusy(true);
    try {
      const items = await rental.available(
        new Date(start).toISOString(),
        new Date(end).toISOString(),
      );
      setResult({ items, start, end });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="PLANIFICACIÓN"
        title="Disponibilidad de equipos"
        description="Agenda de disponibilidad por período."
      />
      <form className="availability-form" onSubmit={search}>
        <label>
          Retiro
          <input
            type="datetime-local"
            required
            disabled={busy}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setResult(undefined);
            }}
          />
        </label>
        <label>
          Devolución prevista
          <input
            type="datetime-local"
            required
            disabled={busy}
            value={end}
            min={start}
            onChange={(e) => {
              setEnd(e.target.value);
              setResult(undefined);
            }}
          />
        </label>
        <button className="button primary" disabled={busy} aria-busy={busy}>
          <CalendarCheck2 size={18} />
          {busy ? "Consultando..." : "Consultar disponibilidad"}
        </button>
      </form>
      <FormError message={error} />
      {busy ? (
        <LoadingRegion label="Consultando disponibilidad">
          <EquipmentSkeleton />
        </LoadingRegion>
      ) : result ? (
        <>
          <div className="section-title">
            <div>
              <h2>{result.items.length} equipos disponibles</h2>
              <p>
                {dateTime(new Date(result.start).toISOString())} a{" "}
                {dateTime(new Date(result.end).toISOString())}
              </p>
            </div>
          </div>
          {result.items.length ? (
            <div className="equipment-grid">
              {result.items.map((e) => (
                <EquipmentCard key={e.id} equipo={e} period={result} />
              ))}
            </div>
          ) : (
            <Empty
              title="Sin disponibilidad para este período"
              text="Probá otras fechas de retiro y devolución."
            />
          )}
        </>
      ) : (
        !error && (
          <Empty
            title="Elegí las fechas del próximo alquiler"
            icon={<CalendarCheck2 size={34} strokeWidth={1.4} />}
          />
        )
      )}
    </>
  );
}
export function Reservas() {
  const { data, canWrite } = useRental(),
    { open } = useUI();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("Todas"),
    [page, setPage] = useState(1);
  const items = data.reservas
    .filter((r) => {
      const c = data.clientes.find((c) => c.id === r.clienteId),
        e = data.equipos.find((e) => e.id === r.equipoId);
      return (
        (status === "Todas" || status === r.estado) &&
        normalize(
          `${r.id} ${c ? fullName(c) : ""} ${e?.nombre || ""}`,
        ).includes(normalize(search))
      );
    })
    .sort((a, b) => b.id - a.id);
  const current = Math.min(page, Math.max(1, Math.ceil(items.length / 10)));
  return (
    <>
      <PageHeading
        eyebrow="ALQUILERES"
        title="Reservas de alquiler"
        description={`${data.reservas.filter((r) => r.estado === "Pendiente").length} pendientes · ${data.reservas.filter((r) => r.estado === "Activa").length} en curso`}
        action={
          canWrite && (
            <button
              className="button primary"
              onClick={() => open({ type: "reservaForm" })}
            >
              <Plus size={18} />
              Nueva reserva
            </button>
          )
        }
      />
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar reserva, cliente o equipo"
        />
        <label className="filter-select">
          <span>Estado</span>
          <select
            aria-label="Estado de reserva"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option>Todas</option>
            <option>Pendiente</option>
            <option value="Activa">En curso</option>
            <option>Finalizada</option>
            <option>Cancelada</option>
          </select>
        </label>
      </div>
      <ReservationTable items={items.slice((current - 1) * 10, current * 10)} />
      <Pager page={current} count={items.length} size={10} onChange={setPage} />
    </>
  );
}
export function Clientes() {
  const { data, canWrite } = useRental(),
    { open } = useUI();
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const items = data.clientes.filter((c) =>
    normalize(`${fullName(c)} ${c.email} ${c.telefono || ""}`).includes(
      normalize(search),
    ),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(items.length / 10)));
  return (
    <>
      <PageHeading
        eyebrow="DIRECTORIO"
        title="Clientes"
        description={`${data.clientes.length} clientes registrados.`}
        action={
          canWrite && (
            <button
              className="button primary"
              onClick={() => open({ type: "clienteForm" })}
            >
              <Plus size={18} />
              Nuevo cliente
            </button>
          )
        }
      />
      <div className="toolbar">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar nombre, correo o teléfono"
        />
      </div>
      {!items.length ? (
        <Empty
          title="No encontramos clientes"
          text={
            data.clientes.length
              ? "Probá otra búsqueda."
              : "Todavía no hay clientes registrados."
          }
          action={
            canWrite && !data.clientes.length ? (
              <button
                className="button"
                onClick={() => open({ type: "clienteForm" })}
              >
                <Plus size={16} />
                Registrar cliente
              </button>
            ) : search ? (
              <button
                className="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                Limpiar búsqueda
              </button>
            ) : undefined
          }
        />
      ) : (
        <div
          className="table-scroll responsive-table"
          tabIndex={0}
          role="region"
          aria-label="Listado de clientes"
        >
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Reservas</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.slice((current - 1) * 10, current * 10).map((c) => (
                <tr key={c.id}>
                  <td data-label="Cliente">
                    <button
                      className="client-name"
                      onClick={() => open({ type: "clienteDetail", id: c.id })}
                    >
                      <span className="avatar">{initials(fullName(c))}</span>
                      <span>
                        <strong>{fullName(c)}</strong>
                        <small>Cliente #{c.id}</small>
                      </span>
                    </button>
                  </td>
                  <td data-label="Contacto">
                    {c.email}
                    <small>{c.telefono || "Sin teléfono"}</small>
                  </td>
                  <td data-label="Reservas">
                    {data.reservas.filter((r) => r.clienteId === c.id).length}
                  </td>
                  <td data-label="Acciones">
                    <button
                      className="icon-button"
                      title={`Ver cliente ${fullName(c)}`}
                      onClick={() => open({ type: "clienteDetail", id: c.id })}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={current} count={items.length} size={10} onChange={setPage} />
    </>
  );
}
