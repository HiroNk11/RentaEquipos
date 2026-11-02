import type {
  Snapshot,
  EquipoInput,
  ClienteInput,
  ReservaInput,
  ReservationAction,
  ReturnInput,
  EstadoEquipo,
} from "../domain/types";
const storageKey = "rentaequipos.demo.v2";
const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const seed = (): Snapshot => ({
  partial: false,
  equipos: [
    {
      id: 1,
      nombre: "Taladro inalámbrico 20 V",
      marca: "Línea Profesional",
      numeroSerie: "EQ-TAL-001",
      estado: "Disponible",
      demoImage: 0,
    },
    {
      id: 2,
      nombre: "Rotomartillo SDS Plus",
      marca: "Línea Industrial",
      numeroSerie: "EQ-ROT-002",
      estado: "EnUso",
      demoImage: 1,
    },
    {
      id: 3,
      nombre: "Hidrolavadora 1.600 W",
      marca: "Línea Profesional",
      numeroSerie: "EQ-HID-003",
      estado: "Disponible",
      demoImage: 2,
    },
    {
      id: 4,
      nombre: "Generador portátil 3 kW",
      marca: "Línea Industrial",
      numeroSerie: "EQ-GEN-004",
      estado: "Mantenimiento",
      demoImage: 3,
    },
    {
      id: 5,
      nombre: "Sierra circular 1.400 W",
      marca: "Línea Profesional",
      numeroSerie: "EQ-SIE-005",
      estado: "EnUso",
      demoImage: 4,
    },
    {
      id: 6,
      nombre: "Escalera de aluminio",
      marca: "Línea Obra",
      numeroSerie: "EQ-ESC-006",
      estado: "Disponible",
      demoImage: 5,
    },
    {
      id: 7,
      nombre: "Taladro percutor 750 W",
      marca: "Línea Profesional",
      numeroSerie: "EQ-TAL-007",
      estado: "Disponible",
      demoImage: 0,
    },
    {
      id: 8,
      nombre: "Rotomartillo 1.500 W",
      marca: "Línea Industrial",
      numeroSerie: "EQ-ROT-008",
      estado: "Disponible",
      demoImage: 1,
    },
    {
      id: 9,
      nombre: "Generador inverter 2 kW",
      marca: "Línea Silenciosa",
      numeroSerie: "EQ-GEN-009",
      estado: "Disponible",
      demoImage: 3,
    },
  ],
  clientes: [
    {
      id: 1,
      nombre: "Martina",
      apellido: "Gómez",
      email: "martina@example.invalid",
      telefono: null,
      direccion: "Dirección de demostración",
    },
    {
      id: 2,
      nombre: "Lucas",
      apellido: "Fernández",
      email: "lucas@example.invalid",
      telefono: null,
      direccion: null,
    },
    {
      id: 3,
      nombre: "Sofía",
      apellido: "Pérez",
      email: "sofia@example.invalid",
      telefono: null,
      direccion: null,
    },
    {
      id: 4,
      nombre: "Diego",
      apellido: "Romero",
      email: "diego@example.invalid",
      telefono: null,
      direccion: null,
    },
    {
      id: 5,
      nombre: "Valentina",
      apellido: "López",
      email: "valentina@example.invalid",
      telefono: null,
      direccion: null,
    },
    {
      id: 6,
      nombre: "Nicolás",
      apellido: "Torres",
      email: "nicolas@example.invalid",
      telefono: null,
      direccion: null,
    },
  ],
  reservas: [
    {
      id: 1001,
      equipoId: 2,
      clienteId: 1,
      fechaInicio: at(-2, 9),
      fechaFinEsperada: at(0, 19),
      fechaDevolucionReal: null,
      costoTotal: 42000,
      estado: "Activa",
    },
    {
      id: 1002,
      equipoId: 5,
      clienteId: 2,
      fechaInicio: at(-1, 10),
      fechaFinEsperada: at(1, 18),
      fechaDevolucionReal: null,
      costoTotal: 28500,
      estado: "Activa",
    },
    {
      id: 1003,
      equipoId: 1,
      clienteId: 3,
      fechaInicio: at(0, 8),
      fechaFinEsperada: at(1, 19),
      fechaDevolucionReal: null,
      costoTotal: 18000,
      estado: "Pendiente",
    },
    {
      id: 1004,
      equipoId: 3,
      clienteId: 4,
      fechaInicio: at(1, 9),
      fechaFinEsperada: at(2, 18),
      fechaDevolucionReal: null,
      costoTotal: 24000,
      estado: "Pendiente",
    },
    {
      id: 1005,
      equipoId: 6,
      clienteId: 5,
      fechaInicio: at(0, 9),
      fechaFinEsperada: at(1, 18),
      fechaDevolucionReal: null,
      costoTotal: 12000,
      estado: "Pendiente",
    },
    {
      id: 1006,
      equipoId: 7,
      clienteId: 6,
      fechaInicio: at(2, 9),
      fechaFinEsperada: at(3, 18),
      fechaDevolucionReal: null,
      costoTotal: 16000,
      estado: "Pendiente",
    },
    {
      id: 1007,
      equipoId: 8,
      clienteId: 1,
      fechaInicio: at(-5, 9),
      fechaFinEsperada: at(-3, 18),
      fechaDevolucionReal: at(-3, 17),
      costoTotal: 36000,
      estado: "Finalizada",
    },
    {
      id: 1008,
      equipoId: 9,
      clienteId: 3,
      fechaInicio: at(-4, 9),
      fechaFinEsperada: at(-2, 18),
      fechaDevolucionReal: null,
      costoTotal: 26000,
      estado: "Cancelada",
    },
  ],
});
export function readDemo(): Snapshot {
  try {
    const data = sessionStorage.getItem(storageKey);
    if (data) {
      const parsed = JSON.parse(data) as Snapshot;
      if (
        Array.isArray(parsed.equipos) &&
        Array.isArray(parsed.reservas) &&
        Array.isArray(parsed.clientes)
      )
        return parsed;
    }
  } catch {
    /* A closed storage area must not prevent a preview. */
  }
  return seed();
}
function persist(data: Snapshot) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    /* Demo remains usable in memory. */
  }
  return data;
}
export function resetDemo() {
  const data = seed();
  return persist(data);
}
const nextId = (items: { id: number }[]) =>
  Math.max(0, ...items.map((item) => item.id)) + 1;
export function demoAvailable(data: Snapshot, start: string, end: string) {
  const a = new Date(start).getTime(),
    b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a)
    throw new Error("La devolución debe ser posterior al retiro.");
  return data.equipos.filter(
    (e) =>
      e.estado !== "Mantenimiento" &&
      !data.reservas.some(
        (r) =>
          r.equipoId === e.id &&
          ["Pendiente", "Activa"].includes(r.estado) &&
          new Date(r.fechaInicio).getTime() < b &&
          new Date(r.fechaFinEsperada).getTime() > a,
      ),
  );
}
export function demoSaveEquipo(
  data: Snapshot,
  input: EquipoInput,
  id?: number,
) {
  if (!input.nombre.trim() || !input.marca.trim() || !input.numeroSerie.trim())
    throw new Error("Nombre, marca y número de serie son obligatorios.");
  if (
    input.nombre.length > 150 ||
    input.marca.length > 100 ||
    input.numeroSerie.length > 100
  )
    throw new Error("El equipo supera la longitud permitida.");
  if (
    data.equipos.some(
      (e) =>
        e.id !== id &&
        e.numeroSerie.toLowerCase() === input.numeroSerie.trim().toLowerCase(),
    )
  )
    throw new Error("Ya existe un equipo con ese número de serie.");
  const previous = data.equipos.find((e) => e.id === id);
  if (id !== undefined && !previous) throw new Error("Equipo no encontrado.");
  const equipo = {
    ...previous,
    ...input,
    nombre: input.nombre.trim(),
    marca: input.marca.trim(),
    numeroSerie: input.numeroSerie.trim(),
    id: id ?? nextId(data.equipos),
    estado: previous?.estado ?? ("Disponible" as const),
  };
  return persist({
    ...data,
    equipos: id
      ? data.equipos.map((e) => (e.id === id ? equipo : e))
      : [...data.equipos, equipo],
  });
}
export function demoSaveCliente(
  data: Snapshot,
  input: ClienteInput,
  id?: number,
) {
  if (!input.nombre.trim() || !input.apellido.trim() || !input.email.trim())
    throw new Error("Nombre, apellido y correo son obligatorios.");
  if (
    input.nombre.length > 150 ||
    input.apellido.length > 150 ||
    input.email.length > 254 ||
    (input.telefono?.length || 0) > 30 ||
    (input.direccion?.length || 0) > 250
  )
    throw new Error("El cliente supera la longitud permitida.");
  if (id !== undefined && !data.clientes.some((c) => c.id === id))
    throw new Error("Cliente no encontrado.");
  const cliente = {
    ...input,
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    email: input.email.trim(),
    id: id ?? nextId(data.clientes),
  };
  return persist({
    ...data,
    clientes: id
      ? data.clientes.map((c) => (c.id === id ? cliente : c))
      : [...data.clientes, cliente],
  });
}
export function demoCreateReserva(data: Snapshot, input: ReservaInput) {
  if (!data.clientes.some((c) => c.id === input.clienteId))
    throw new Error("Seleccioná un cliente.");
  if (
    !demoAvailable(data, input.fechaInicio, input.fechaFinEsperada).some(
      (e) => e.id === input.equipoId,
    )
  )
    throw new Error("El equipo ya no está disponible para ese período.");
  if (
    !Number.isFinite(input.costoTotal) ||
    input.costoTotal < 0 ||
    input.costoTotal > 9999999999.99 ||
    Math.abs(Math.round(input.costoTotal * 100) - input.costoTotal * 100) >
      0.0001
  )
    throw new Error(
      "El importe debe ser cero o positivo, con hasta dos decimales.",
    );
  return persist({
    ...data,
    reservas: [
      ...data.reservas,
      {
        ...input,
        id: Math.max(1000, nextId(data.reservas)),
        estado: "Pendiente",
        fechaDevolucionReal: null,
      },
    ],
  });
}
export function demoAct(
  data: Snapshot,
  id: number,
  action: ReservationAction,
  body?: ReturnInput,
) {
  const r = data.reservas.find((item) => item.id === id);
  if (!r) throw new Error("Reserva no encontrada.");
  const e = data.equipos.find((item) => item.id === r.equipoId);
  if (!e) throw new Error("Equipo no encontrado.");
  let updated = { ...r },
    equipo = { ...e };
  if (action === "cancelar") {
    if (r.estado === "Cancelada") return data;
    if (r.estado !== "Pendiente")
      throw new Error("Solo se cancelan reservas pendientes.");
    updated.estado = "Cancelada";
  } else if (action === "activar") {
    if (r.estado === "Activa") return data;
    const now = Date.now();
    if (
      r.estado !== "Pendiente" ||
      now < +new Date(r.fechaInicio) ||
      now >= +new Date(r.fechaFinEsperada) ||
      e.estado !== "Disponible"
    )
      throw new Error(
        "La reserva debe estar dentro del período y el equipo disponible.",
      );
    updated.estado = "Activa";
    equipo.estado = "EnUso";
  } else {
    if (r.estado === "Finalizada") return data;
    if (r.estado !== "Activa" || e.estado !== "EnUso")
      throw new Error("Solo se puede devolver un alquiler en curso.");
    const when = body?.fechaDevolucionReal || new Date().toISOString();
    if (
      !Number.isFinite(+new Date(when)) ||
      +new Date(when) < +new Date(r.fechaInicio) ||
      +new Date(when) > Date.now()
    )
      throw new Error("Fecha de devolución inválida.");
    updated = { ...r, estado: "Finalizada", fechaDevolucionReal: when };
    equipo.estado = body?.requiereMantenimiento
      ? "Mantenimiento"
      : "Disponible";
  }
  return persist({
    ...data,
    reservas: data.reservas.map((item) => (item.id === id ? updated : item)),
    equipos: data.equipos.map((item) => (item.id === e.id ? equipo : item)),
  });
}
export function demoEstado(data: Snapshot, id: number, estado: EstadoEquipo) {
  if (!data.equipos.some((e) => e.id === id))
    throw new Error("Equipo no encontrado.");
  if (
    estado !== "EnUso" &&
    data.reservas.some((r) => r.equipoId === id && r.estado === "Activa")
  )
    throw new Error("El equipo tiene un alquiler en curso.");
  return persist({
    ...data,
    equipos: data.equipos.map((e) => (e.id === id ? { ...e, estado } : e)),
  });
}
export function demoRemove(
  data: Snapshot,
  kind: "equipos" | "clientes",
  id: number,
) {
  if (!data[kind].some((item) => item.id === id))
    throw new Error("Registro no encontrado.");
  if (
    data.reservas.some((r) =>
      kind === "equipos" ? r.equipoId === id : r.clienteId === id,
    )
  )
    throw new Error(
      "No se puede eliminar un registro con historial de reservas.",
    );
  if (
    kind === "equipos" &&
    data.equipos.find((e) => e.id === id)?.estado === "EnUso"
  )
    throw new Error("No se puede eliminar un equipo en uso.");
  return persist({
    ...data,
    [kind]: data[kind].filter((item) => item.id !== id),
  });
}
