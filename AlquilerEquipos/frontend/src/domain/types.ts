export type EstadoEquipo = "Disponible" | "EnUso" | "Mantenimiento";
export type EstadoReserva = "Pendiente" | "Activa" | "Finalizada" | "Cancelada";
export interface Equipo {
  id: number;
  nombre: string;
  marca: string;
  numeroSerie: string;
  estado: EstadoEquipo;
  demoImage?: number;
}
export interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
}
export interface Reserva {
  id: number;
  equipoId: number;
  clienteId: number;
  fechaInicio: string;
  fechaFinEsperada: string;
  fechaDevolucionReal: string | null;
  costoTotal: number;
  estado: EstadoReserva;
}
export type EquipoInput = Pick<Equipo, "nombre" | "marca" | "numeroSerie">;
export type ClienteInput = Omit<Cliente, "id">;
export type ReservaInput = Pick<
  Reserva,
  "equipoId" | "clienteId" | "fechaInicio" | "fechaFinEsperada" | "costoTotal"
>;
export interface Snapshot {
  equipos: Equipo[];
  clientes: Cliente[];
  reservas: Reserva[];
  partial: boolean;
}
export type Mode = "api" | "demo";
export type ReservationAction = "cancelar" | "activar" | "devolver";
export interface ReturnInput {
  fechaDevolucionReal: string | null;
  requiereMantenimiento: boolean;
}
