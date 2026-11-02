import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Cliente, Equipo } from "../domain/types";
import { useRental } from "../context/useRental";
import { useUI } from "../context/useUI";
import { useNotify } from "../context/useNotify";
import { currency, defaultPeriod } from "../lib/format";
import { errorMessage } from "../lib/api";
import { FormError, Modal, Submit } from "./ui";
import { LoadingRegion, Skeleton } from "./Skeleton";

export function EquipoForm({ equipo }: { equipo?: Equipo }) {
  const rental = useRental(),
    ui = useUI(),
    notify = useNotify();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await rental.saveEquipo(
        {
          nombre: String(fields.get("nombre")).trim(),
          marca: String(fields.get("marca")).trim(),
          numeroSerie: String(fields.get("serie")).trim(),
        },
        equipo?.id,
      );
      notify(equipo ? "Equipo actualizado." : "Equipo agregado al inventario.");
      ui.close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={equipo ? "Editar equipo" : "Nuevo equipo"}
      onClose={ui.close}
      busy={busy}
    >
      <form onSubmit={save}>
        <fieldset
          className="form-fields"
          disabled={busy}
          aria-label="Datos del equipo"
        >
          <label>
            Nombre del equipo
            <input
              autoFocus
              required
              name="nombre"
              maxLength={150}
              defaultValue={equipo?.nombre}
              placeholder="Ej. Taladro inalámbrico 20 V"
            />
          </label>
          <label>
            Marca o línea
            <input
              required
              name="marca"
              maxLength={100}
              defaultValue={equipo?.marca}
              placeholder="Marca del equipo"
            />
          </label>
          <label>
            Número de serie
            <input
              required
              name="serie"
              maxLength={100}
              defaultValue={equipo?.numeroSerie}
              placeholder="Ej. EQ-TAL-010"
            />
          </label>
          <FormError message={error} />
        </fieldset>
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={ui.close}
          >
            Cancelar
          </button>
          <Submit busy={busy}>
            {equipo ? (
              "Guardar cambios"
            ) : (
              <>
                <Plus size={16} />
                Agregar equipo
              </>
            )}
          </Submit>
        </div>
      </form>
    </Modal>
  );
}
export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const rental = useRental(),
    ui = useUI(),
    notify = useNotify();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await rental.saveCliente(
        {
          nombre: String(fields.get("nombre")).trim(),
          apellido: String(fields.get("apellido")).trim(),
          email: String(fields.get("email")).trim(),
          telefono: String(fields.get("telefono")).trim() || null,
          direccion: String(fields.get("direccion")).trim() || null,
        },
        cliente?.id,
      );
      notify(cliente ? "Cliente actualizado." : "Cliente registrado.");
      ui.close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={cliente ? "Editar cliente" : "Nuevo cliente"}
      onClose={ui.close}
      busy={busy}
    >
      <form onSubmit={save}>
        <fieldset
          className="form-fields"
          disabled={busy}
          aria-label="Datos del cliente"
        >
          <div className="form-grid">
            <label>
              Nombre
              <input
                autoFocus
                required
                name="nombre"
                maxLength={150}
                defaultValue={cliente?.nombre}
                autoComplete="given-name"
              />
            </label>
            <label>
              Apellido
              <input
                required
                name="apellido"
                maxLength={150}
                defaultValue={cliente?.apellido}
                autoComplete="family-name"
              />
            </label>
          </div>
          <label>
            Correo electrónico
            <input
              required
              type="email"
              name="email"
              maxLength={254}
              defaultValue={cliente?.email}
              autoComplete="email"
              placeholder="nombre@ejemplo.com"
            />
          </label>
          <label>
            Teléfono <span className="optional">Opcional</span>
            <input
              type="tel"
              name="telefono"
              maxLength={30}
              defaultValue={cliente?.telefono || ""}
              autoComplete="tel"
            />
          </label>
          <label>
            Dirección <span className="optional">Opcional</span>
            <input
              name="direccion"
              maxLength={250}
              defaultValue={cliente?.direccion || ""}
              autoComplete="street-address"
            />
          </label>
          <FormError message={error} />
        </fieldset>
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={ui.close}
          >
            Cancelar
          </button>
          <Submit busy={busy}>
            {cliente ? "Guardar cambios" : "Registrar cliente"}
          </Submit>
        </div>
      </form>
    </Modal>
  );
}
export function ReservaForm({
  equipoId,
  start: suppliedStart,
  end: suppliedEnd,
}: {
  equipoId?: number;
  start?: string;
  end?: string;
}) {
  const rental = useRental(),
    ui = useUI(),
    notify = useNotify();
  const initial = defaultPeriod();
  const [start, setStart] = useState(suppliedStart || initial.start),
    [end, setEnd] = useState(suppliedEnd || initial.end);
  const [selected, setSelected] = useState(String(equipoId || ""));
  const [choices, setChoices] = useState<Equipo[]>([]),
    [checking, setChecking] = useState(true);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { available } = rental;
  useEffect(() => {
    const controller = new AbortController();
    if (!start || !end || +new Date(end) <= +new Date(start)) {
      // oxlint-disable-next-line react/set-state-in-effect -- Discard stale results when the external availability query becomes invalid.
      setChoices([]);
      setChecking(false);
      setError("La devolución debe ser posterior al retiro.");
      return;
    }
    setChecking(true);
    setError("");
    const timer = window.setTimeout(() => {
      available(
        new Date(start).toISOString(),
        new Date(end).toISOString(),
        controller.signal,
      )
        .then((items) => {
          if (!controller.signal.aborted) {
            setChoices(items);
            setSelected((current) =>
              items.some((e) => String(e.id) === current) ? current : "",
            );
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) {
            setChoices([]);
            setError(errorMessage(cause));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setChecking(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [start, end, available]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!start || !end || +new Date(end) <= +new Date(start)) {
      setError("La devolución debe ser posterior al retiro.");
      return;
    }
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await rental.createReserva({
        equipoId: Number(selected),
        clienteId: Number(fields.get("cliente")),
        fechaInicio: new Date(start).toISOString(),
        fechaFinEsperada: new Date(end).toISOString(),
        costoTotal: Number(fields.get("importe")),
      });
      notify("Reserva creada.");
      ui.close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Nueva reserva" onClose={ui.close} busy={busy}>
      <form onSubmit={save}>
        <fieldset
          className="form-fields"
          disabled={busy}
          aria-label="Datos de la reserva"
        >
          <label htmlFor="reserva-cliente">
            Cliente
            <select
              id="reserva-cliente"
              autoFocus
              required
              name="cliente"
              defaultValue=""
            >
              <option value="" disabled>
                Seleccionar cliente
              </option>
              {rental.data.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              Retiro
              <input
                required
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Devolución prevista
              <input
                required
                type="datetime-local"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <label htmlFor="reserva-equipo">
            Equipo
            {checking && (
              <LoadingRegion label="Consultando equipos disponibles">
                <Skeleton className="skeleton-field" />
              </LoadingRegion>
            )}
            <select
              hidden={checking}
              id="reserva-equipo"
              required
              disabled={checking}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">
                {checking
                  ? "Seleccionar equipo disponible"
                  : choices.length
                    ? "Seleccionar equipo disponible"
                    : "Sin equipos para este período"}
              </option>
              {choices.map((e) => (
                <option value={e.id} key={e.id}>
                  {e.nombre} · {e.numeroSerie}
                </option>
              ))}
            </select>
          </label>
          <label>
            Importe acordado <span className="optional">{currency}</span>
            <input
              required
              type="number"
              name="importe"
              min="0"
              max="9999999999.99"
              step="0.01"
              placeholder="0,00"
              inputMode="decimal"
            />
          </label>
          {!rental.data.clientes.length && (
            <div className="form-error">
              No hay clientes registrados.
              <button
                type="button"
                className="text-button"
                onClick={() => ui.open({ type: "clienteForm" })}
              >
                Registrar un cliente
              </button>
            </div>
          )}
          <FormError message={error} />
        </fieldset>
        <div className="form-actions">
          <button
            type="button"
            className="button"
            onClick={ui.close}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={
              busy || checking || !selected || !rental.data.clientes.length
            }
          >
            {busy ? "Guardando..." : "Crear reserva"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
