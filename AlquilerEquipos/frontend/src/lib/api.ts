import axios from "axios";
import type {
  Cliente,
  ClienteInput,
  Equipo,
  EquipoInput,
  Reserva,
  ReservaInput,
  ReturnInput,
  ReservationAction,
  Snapshot,
  EstadoEquipo,
} from "../domain/types";

export const apiUrl = import.meta.env.VITE_API_URL || "/api";
const client = axios.create({
  baseURL: apiUrl.replace(/\/$/, ""),
  timeout: 15_000,
});
const authorization = (token?: string) =>
  token ? { Authorization: "Bearer " + token } : {};

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const method = error.config?.method?.toUpperCase();
    if (
      method &&
      !["GET", "HEAD", "OPTIONS"].includes(method) &&
      (!error.response || error.response.status >= 500)
    ) {
      return "No se pudo confirmar el resultado. Actualizá los datos antes de volver a enviar la operación.";
    }
    if (error.response?.status === 401)
      return "Tu sesión venció o no está autorizada. Volvé a ingresar.";
    if (error.response?.status === 403)
      return "Tu cuenta no tiene permiso para esta acción.";
    if (error.response?.status === 429)
      return "Hay muchas solicitudes. Esperá un minuto y reintentá.";
    if (error.response?.status === 503)
      return "El servicio está ocupado. Reintentá en unos instantes.";
    const data = error.response?.data;
    if (data && typeof data === "object") {
      if (data.detail) return String(data.detail);
      if (data.errors) return Object.values(data.errors).flat().join(" ");
      if (data.title && error.response!.status < 500) return String(data.title);
    }
    return "No pudimos conectar con el servicio. Revisá la conexión y reintentá.";
  }
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}

async function all<T>(
  path: string,
  token?: string,
  signal?: AbortSignal,
  filters?: Record<string, string>,
) {
  const items: T[] = [];
  for (let page = 1; page <= 5; page++) {
    const result = await client.get<T[]>(path, {
      params: { ...filters, pagina: page, tamanioPagina: 100 },
      headers: authorization(token),
      signal,
    });
    items.push(...result.data);
    if (result.data.length < 100) return { items, partial: false };
  }
  return { items, partial: true };
}
export async function loadSnapshot(
  token?: string,
  signal?: AbortSignal,
): Promise<Snapshot> {
  const [equipos, clientes, reservas] = await Promise.all([
    all<Equipo>("/equipos", token, signal),
    all<Cliente>("/clientes", token, signal),
    all<Reserva>("/reservas", token, signal),
  ]);
  return {
    equipos: equipos.items,
    clientes: clientes.items,
    reservas: reservas.items,
    partial: equipos.partial || clientes.partial || reservas.partial,
  };
}
export async function available(
  start: string,
  end: string,
  token?: string,
  signal?: AbortSignal,
) {
  const result = await all<Equipo>("/equipos/disponibles", token, signal, {
    fechaInicio: start,
    fechaFin: end,
  });
  if (result.partial)
    throw new Error(
      "La consulta supera los 500 equipos. No se muestran resultados incompletos de disponibilidad.",
    );
  return result.items;
}
export async function saveEquipo(
  input: EquipoInput,
  id: number | undefined,
  token?: string,
) {
  if (!id)
    return (
      await client.post<Equipo>("/equipos", input, {
        headers: authorization(token),
      })
    ).data;
  await client.put("/equipos/" + id, input, { headers: authorization(token) });
  return (
    await client.get<Equipo>("/equipos/" + id, {
      headers: authorization(token),
    })
  ).data;
}
export async function saveCliente(
  input: ClienteInput,
  id: number | undefined,
  token?: string,
) {
  if (!id)
    return (
      await client.post<Cliente>("/clientes", input, {
        headers: authorization(token),
      })
    ).data;
  await client.put("/clientes/" + id, input, { headers: authorization(token) });
  return (
    await client.get<Cliente>("/clientes/" + id, {
      headers: authorization(token),
    })
  ).data;
}
export async function createReserva(input: ReservaInput, token?: string) {
  return (
    await client.post<Reserva>("/reservas", input, {
      headers: authorization(token),
    })
  ).data;
}
export async function actReserva(
  id: number,
  action: ReservationAction,
  body: ReturnInput | undefined,
  token?: string,
) {
  await client.patch("/reservas/" + id + "/" + action, body ?? {}, {
    headers: authorization(token),
  });
  const reserva = (
    await client.get<Reserva>("/reservas/" + id, {
      headers: authorization(token),
    })
  ).data;
  const equipo = (
    await client.get<Equipo>("/equipos/" + reserva.equipoId, {
      headers: authorization(token),
    })
  ).data;
  return { reserva, equipo };
}
export async function setEstado(
  id: number,
  estado: EstadoEquipo,
  token?: string,
) {
  await client.patch(
    "/equipos/" + id + "/estado",
    { estado },
    { headers: authorization(token) },
  );
  return (
    await client.get<Equipo>("/equipos/" + id, {
      headers: authorization(token),
    })
  ).data;
}
export async function removeResource(
  kind: "equipos" | "clientes",
  id: number,
  token?: string,
) {
  await client.delete("/" + kind + "/" + id, { headers: authorization(token) });
}
