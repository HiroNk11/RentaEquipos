import { useState } from "react";
import {
  Pencil,
  Trash2,
  CalendarPlus,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { useUI, type ModalState } from "../context/useUI";
import { useRental } from "../context/useRental";
import { useSession } from "../context/useSession";
import { useNotify } from "../context/useNotify";
import { dateTime, fullName, money } from "../lib/format";
import { errorMessage } from "../lib/api";
import { Badge, FormError, Modal, ToolImage } from "./ui";
import { ClienteForm, EquipoForm, ReservaForm } from "./Forms";
import { ReservationTable } from "./ReservationTable";
import { useNow } from "../lib/useNow";
export function ModalHost() {
  const { modal } = useUI();
  return modal ? <Content key={JSON.stringify(modal)} modal={modal} /> : null;
}
function Content({ modal }: { modal: ModalState }) {
  const now = useNow();
  const ui = useUI(),
    rental = useRental(),
    session = useSession(),
    notify = useNotify();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [maintenance, setMaintenance] = useState(false);
  const { data, canWrite, isAdmin } = rental;
  async function run(work: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    try {
      await work();
      notify(message);
      ui.close();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  if (modal.type === "equipoForm")
    return <EquipoForm equipo={data.equipos.find((e) => e.id === modal.id)} />;
  if (modal.type === "clienteForm")
    return (
      <ClienteForm cliente={data.clientes.find((c) => c.id === modal.id)} />
    );
  if (modal.type === "reservaForm") return <ReservaForm {...modal} />;
  if (modal.type === "connection")
    return (
      <Modal title="Espacio de trabajo" onClose={ui.close}>
        <div className="form-fields">
          <div className="connection-symbol">
            <ShieldCheck size={32} />
          </div>
          <p>
            Origen actual:{" "}
            <strong>
              {rental.mode === "demo"
                ? "Demostración"
                : "API de AlquilerEquipos"}
            </strong>
          </p>
          <p className="muted">
            La demostración utiliza datos ficticios guardados únicamente en esta
            pestaña. No modifica la base de datos.
          </p>
          <button
            className="button primary"
            disabled={!!rental.busy}
            onClick={() => {
              rental.switchMode(rental.mode === "demo" ? "api" : "demo");
              ui.close();
            }}
          >
            {rental.mode === "demo"
              ? "Conectar con la API"
              : "Abrir demostración"}
          </button>
          {rental.mode === "api" &&
            !session.authenticated &&
            session.configured && (
              <button
                className="button"
                onClick={() => void run(session.login, "")}
              >
                Iniciar sesión
              </button>
            )}
          <FormError message={error} />
        </div>
      </Modal>
    );
  if (modal.type === "resetDemo")
    return (
      <Modal title="Restablecer demostración" onClose={ui.close}>
        <p>
          Se eliminarán los cambios realizados en los datos ficticios de esta
          pestaña.
        </p>
        <div className="form-actions">
          <button className="button" onClick={ui.close}>
            Volver
          </button>
          <button
            className="button danger"
            onClick={() => {
              rental.reset();
              notify("Demostración restablecida.");
              ui.close();
            }}
          >
            Restablecer
          </button>
        </div>
      </Modal>
    );
  if (modal.type === "remove")
    return (
      <Modal
        title={
          modal.kind === "equipos" ? "Eliminar equipo" : "Eliminar cliente"
        }
        onClose={ui.close}
        busy={busy}
      >
        <p>
          Esta acción es permanente. Los registros con historial de reservas no
          se pueden eliminar.
        </p>
        <FormError message={error} />
        <div className="form-actions">
          <button className="button" disabled={busy} onClick={ui.close}>
            Volver
          </button>
          <button
            className="button danger"
            disabled={busy || !isAdmin}
            onClick={() =>
              void run(
                () => rental.remove(modal.kind, modal.id),
                "Registro eliminado.",
              )
            }
          >
            <Trash2 size={16} />
            {busy ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </Modal>
    );
  if (modal.type === "action") {
    const title = {
      cancelar: "Cancelar reserva",
      activar: "Registrar retiro",
      devolver: "Registrar devolución",
    }[modal.action];
    return (
      <Modal title={title} onClose={ui.close} busy={busy}>
        <div className="form-fields">
          <p>
            Reserva <strong>#{modal.id}</strong>
          </p>
          <p className="muted">
            {modal.action === "cancelar"
              ? "El período reservado volverá a estar disponible."
              : modal.action === "activar"
                ? "El equipo quedará registrado como entregado al cliente."
                : "Se registrará la devolución con la fecha y hora actuales."}
          </p>
          {modal.action === "devolver" && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={maintenance}
                onChange={(e) => setMaintenance(e.target.checked)}
              />
              El equipo requiere mantenimiento
            </label>
          )}
          <FormError message={error} />
        </div>
        <div className="form-actions">
          <button className="button" disabled={busy} onClick={ui.close}>
            Volver
          </button>
          <button
            className={
              "button " + (modal.action === "cancelar" ? "danger" : "primary")
            }
            disabled={busy || !canWrite}
            onClick={() =>
              void run(
                () =>
                  rental.act(
                    modal.id,
                    modal.action,
                    modal.action === "devolver"
                      ? {
                          fechaDevolucionReal: null,
                          requiereMantenimiento: maintenance,
                        }
                      : undefined,
                  ),
                "Reserva actualizada.",
              )
            }
          >
            {busy ? "Guardando..." : title}
          </button>
        </div>
      </Modal>
    );
  }
  if (modal.type === "equipoDetail") {
    const e = data.equipos.find((e) => e.id === modal.id);
    if (!e) return null;
    return (
      <Modal title="Detalle del equipo" onClose={ui.close} drawer busy={busy}>
        <ToolImage equipo={e} />
        <div className="detail-title">
          <h2>{e.nombre}</h2>
          <Badge value={e.estado} />
        </div>
        <dl className="detail-list">
          <div>
            <dt>Marca o línea</dt>
            <dd>{e.marca}</dd>
          </div>
          <div>
            <dt>Número de serie</dt>
            <dd>{e.numeroSerie}</dd>
          </div>
          <div>
            <dt>Identificador</dt>
            <dd>#{e.id}</dd>
          </div>
        </dl>
        {canWrite && (
          <div className="detail-actions">
            <button
              className="button"
              onClick={() => ui.open({ type: "equipoForm", id: e.id })}
            >
              <Pencil size={16} />
              Editar
            </button>
            <button
              className="button primary"
              onClick={() => ui.open({ type: "reservaForm", equipoId: e.id })}
              disabled={e.estado === "Mantenimiento"}
            >
              <CalendarPlus size={16} />
              Reservar
            </button>
            <label>
              Estado físico
              <select
                value={e.estado}
                disabled={busy || e.estado === "EnUso"}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "Disponible" || value === "Mantenimiento")
                    void run(
                      () => rental.setEstado(e.id, value),
                      "Estado actualizado.",
                    );
                }}
              >
                <option value="Disponible">Disponible</option>
                <option value="EnUso" disabled>
                  En alquiler
                </option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </label>
          </div>
        )}
        <FormError message={error} />
        <h3 className="section-heading">Historial de reservas</h3>
        <ReservationTable
          items={data.reservas.filter((r) => r.equipoId === e.id)}
        />
        {isAdmin && (
          <button
            className="text-button destructive"
            onClick={() =>
              ui.open({ type: "remove", kind: "equipos", id: e.id })
            }
          >
            <Trash2 size={16} />
            Eliminar equipo
          </button>
        )}
      </Modal>
    );
  }
  if (modal.type === "clienteDetail") {
    const c = data.clientes.find((c) => c.id === modal.id);
    if (!c) return null;
    return (
      <Modal title="Ficha del cliente" onClose={ui.close} drawer>
        <div className="detail-title">
          <h2>{fullName(c)}</h2>
          <span className="muted">Cliente #{c.id}</span>
        </div>
        <dl className="detail-list">
          <div>
            <dt>Correo electrónico</dt>
            <dd>{c.email}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{c.telefono || "Sin registrar"}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd>{c.direccion || "Sin registrar"}</dd>
          </div>
        </dl>
        {canWrite && (
          <button
            className="button"
            onClick={() => ui.open({ type: "clienteForm", id: c.id })}
          >
            <Pencil size={16} />
            Editar cliente
          </button>
        )}
        <h3 className="section-heading">Reservas del cliente</h3>
        <ReservationTable
          items={data.reservas.filter((r) => r.clienteId === c.id)}
        />
        {isAdmin && (
          <button
            className="text-button destructive"
            onClick={() =>
              ui.open({ type: "remove", kind: "clientes", id: c.id })
            }
          >
            <Trash2 size={16} />
            Eliminar cliente
          </button>
        )}
      </Modal>
    );
  }
  if (modal.type === "reservaDetail") {
    const r = data.reservas.find((r) => r.id === modal.id);
    if (!r) return null;
    const e = data.equipos.find((e) => e.id === r.equipoId),
      c = data.clientes.find((c) => c.id === r.clienteId);
    const pickup =
      r.estado === "Pendiente" &&
      +new Date(r.fechaInicio) <= now &&
      +new Date(r.fechaFinEsperada) > now &&
      e?.estado === "Disponible";
    return (
      <Modal title={`Reserva #${r.id}`} onClose={ui.close} drawer>
        <Badge value={r.estado} />
        <div className="reservation-equipment">
          <ToolImage equipo={e} small />
          <div>
            <h2>{e?.nombre || `Equipo #${r.equipoId}`}</h2>
            <span className="muted">{e?.numeroSerie}</span>
          </div>
        </div>
        <button
          className="table-link"
          onClick={() => ui.open({ type: "clienteDetail", id: r.clienteId })}
        >
          {c ? fullName(c) : `Cliente #${r.clienteId}`}
          <ArrowUpRight size={15} />
        </button>
        <dl className="detail-list">
          <div>
            <dt>Retiro previsto</dt>
            <dd>{dateTime(r.fechaInicio)}</dd>
          </div>
          <div>
            <dt>Devolución prevista</dt>
            <dd>{dateTime(r.fechaFinEsperada)}</dd>
          </div>
          {r.fechaDevolucionReal && (
            <div>
              <dt>Devolución registrada</dt>
              <dd>{dateTime(r.fechaDevolucionReal)}</dd>
            </div>
          )}
          <div>
            <dt>Importe acordado</dt>
            <dd className="total">{money(r.costoTotal)}</dd>
          </div>
        </dl>
        {canWrite && (
          <div className="detail-actions">
            {r.estado === "Pendiente" && (
              <>
                <button
                  className="button primary"
                  disabled={!pickup}
                  title={
                    !pickup
                      ? "El retiro requiere estar dentro del período y tener el equipo disponible"
                      : undefined
                  }
                  onClick={() =>
                    ui.open({ type: "action", action: "activar", id: r.id })
                  }
                >
                  Registrar retiro
                </button>
                <button
                  className="button danger-outline"
                  onClick={() =>
                    ui.open({ type: "action", action: "cancelar", id: r.id })
                  }
                >
                  Cancelar reserva
                </button>
              </>
            )}
            {r.estado === "Activa" && (
              <button
                className="button primary"
                onClick={() =>
                  ui.open({ type: "action", action: "devolver", id: r.id })
                }
              >
                Registrar devolución
              </button>
            )}
          </div>
        )}
      </Modal>
    );
  }
  return null;
}
