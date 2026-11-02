import { ArrowUpRight } from "lucide-react";
import type { Reserva } from "../domain/types";
import { useRental } from "../context/useRental";
import { useUI } from "../context/useUI";
import { dateTime, fullName, money } from "../lib/format";
import { Badge, Empty } from "./ui";
import { useNow } from "../lib/useNow";
export function ReservationTable({ items }: { items: Reserva[] }) {
  const now = useNow();
  const { data } = useRental(),
    { open } = useUI();
  if (!items.length)
    return (
      <Empty
        title="Sin reservas"
        text="No hay reservas que coincidan con esta vista."
      />
    );
  return (
    <div
      className="table-scroll responsive-table"
      tabIndex={0}
      role="region"
      aria-label="Listado de reservas"
    >
      <table>
        <thead>
          <tr>
            <th>Reserva / cliente</th>
            <th>Equipo</th>
            <th>Retiro</th>
            <th>Devolución prevista</th>
            <th>Estado</th>
            <th className="numeric">Importe</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => {
            const c = data.clientes.find((c) => c.id === r.clienteId),
              e = data.equipos.find((e) => e.id === r.equipoId);
            return (
              <tr key={r.id}>
                <td data-label="Reserva / cliente">
                  <button
                    className="table-link"
                    onClick={() => open({ type: "reservaDetail", id: r.id })}
                  >
                    #{r.id}
                  </button>
                  <small>{c ? fullName(c) : `Cliente #${r.clienteId}`}</small>
                </td>
                <td data-label="Equipo">
                  <strong>{e?.nombre || `Equipo #${r.equipoId}`}</strong>
                  <small>{e?.numeroSerie}</small>
                </td>
                <td data-label="Retiro">{dateTime(r.fechaInicio)}</td>
                <td
                  data-label="Devolución prevista"
                  className={
                    r.estado === "Activa" && +new Date(r.fechaFinEsperada) < now
                      ? "overdue"
                      : ""
                  }
                >
                  {dateTime(r.fechaFinEsperada)}
                </td>
                <td data-label="Estado">
                  <Badge value={r.estado} />
                </td>
                <td className="numeric" data-label="Importe">
                  {money(r.costoTotal)}
                </td>
                <td data-label="Acciones">
                  <button
                    className="icon-button"
                    title={`Ver reserva #${r.id}`}
                    aria-label={`Ver reserva #${r.id}`}
                    onClick={() => open({ type: "reservaDetail", id: r.id })}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
