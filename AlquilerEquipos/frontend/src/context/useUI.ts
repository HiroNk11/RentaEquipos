import { createContext, useContext } from "react";
import type { ReservationAction } from "../domain/types";
export type ModalState =
  | { type: "equipoForm"; id?: number }
  | { type: "clienteForm"; id?: number }
  | { type: "reservaForm"; equipoId?: number; start?: string; end?: string }
  | { type: "equipoDetail" | "clienteDetail" | "reservaDetail"; id: number }
  | { type: "action"; id: number; action: ReservationAction }
  | { type: "remove"; kind: "equipos" | "clientes"; id: number }
  | { type: "connection" | "resetDemo" };
export const UIContext = createContext<{
  modal?: ModalState;
  open: (state: ModalState) => void;
  close: () => void;
} | null>(null);
export function useUI() {
  const value = useContext(UIContext);
  if (!value) throw new Error("UIProvider missing");
  return value;
}
