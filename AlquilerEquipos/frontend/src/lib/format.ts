export const currency = /^[A-Z]{3}$/.test(import.meta.env.VITE_CURRENCY ?? "")
  ? import.meta.env.VITE_CURRENCY
  : "ARS";
export const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const shortDate = (value: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
export const fullName = (client?: { nombre: string; apellido: string }) =>
  client ? client.nombre + " " + client.apellido : "Cliente no cargado";
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function localInput(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}
export function defaultPeriod() {
  const start = new Date();
  start.setSeconds(0, 0);
  return {
    start: localInput(start),
    end: localInput(new Date(start.getTime() + 24 * 3600_000)),
  };
}
export const sameDay = (a: string, b: Date) =>
  new Date(a).toDateString() === b.toDateString();
export const statusLabel: Record<string, string> = {
  Disponible: "Disponible",
  EnUso: "En alquiler",
  Mantenimiento: "Mantenimiento",
  Pendiente: "Pendiente",
  Activa: "En curso",
  Finalizada: "Finalizada",
  Cancelada: "Cancelada",
};
