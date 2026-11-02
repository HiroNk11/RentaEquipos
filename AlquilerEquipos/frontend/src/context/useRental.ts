import { createContext, useContext } from "react";
import type {
  ClienteInput,
  EquipoInput,
  Mode,
  ReservaInput,
  ReturnInput,
  ReservationAction,
  Snapshot,
  EstadoEquipo,
} from "../domain/types";
export interface RentalContextValue {
  data: Snapshot;
  mode: Mode;
  loading: boolean;
  error: string;
  busy: number;
  canWrite: boolean;
  isAdmin: boolean;
  switchMode: (mode: Mode) => void;
  reload: () => void;
  reset: () => void;
  saveEquipo: (input: EquipoInput, id?: number) => Promise<void>;
  saveCliente: (input: ClienteInput, id?: number) => Promise<void>;
  createReserva: (input: ReservaInput) => Promise<void>;
  act: (
    id: number,
    action: ReservationAction,
    body?: ReturnInput,
  ) => Promise<void>;
  setEstado: (id: number, estado: EstadoEquipo) => Promise<void>;
  remove: (kind: "equipos" | "clientes", id: number) => Promise<void>;
  available: (
    start: string,
    end: string,
    signal?: AbortSignal,
  ) => Promise<Snapshot["equipos"]>;
}
export const RentalContext = createContext<RentalContextValue | null>(null);
export function useRental() {
  const value = useContext(RentalContext);
  if (!value) throw new Error("RentalProvider missing");
  return value;
}
