import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Mode, Snapshot } from "../domain/types";
import * as api from "../lib/api";
import * as demo from "../lib/demo";
import { useSession } from "./useSession";
import { RentalContext as Context, type RentalContextValue } from "./useRental";

const empty: Snapshot = {
  equipos: [],
  clientes: [],
  reservas: [],
  partial: false,
};
function initialMode(): Mode {
  try {
    const stored = sessionStorage.getItem("rentaequipos.mode");
    if (stored === "demo" || stored === "api") return stored;
  } catch {
    /* Storage may be unavailable. */
  }
  return import.meta.env.VITE_DEMO_MODE === "true" ? "demo" : "api";
}
export function RentalProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [data, setData] = useState<Snapshot>(() =>
    mode === "demo" ? demo.readDemo() : empty,
  );
  const ref = useRef(data);
  const epoch = useRef(0);
  const [loading, setLoading] = useState(mode === "api");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(0);
  const [revision, setRevision] = useState(0);
  const commit = useCallback(
    (value: Snapshot | ((current: Snapshot) => Snapshot)) => {
      const next = typeof value === "function" ? value(ref.current) : value;
      ref.current = next;
      setData(next);
    },
    [],
  );
  /* oxlint-disable react/set-state-in-effect -- Synchronize external auth/API and demo stores, clearing stale workspace data. */
  useEffect(() => {
    epoch.current++;
    const controller = new AbortController();
    if (mode === "demo") {
      commit(demo.readDemo());
      setLoading(false);
      setError("");
      return () => controller.abort();
    }
    if (session.loading) {
      commit(empty);
      setLoading(true);
      return () => controller.abort();
    }
    if (!session.authenticated && !session.anonymous) {
      commit(empty);
      setLoading(false);
      setError(
        session.configured
          ? "Iniciá sesión para acceder a tu espacio."
          : "La conexión segura todavía no está configurada.",
      );
      return () => controller.abort();
    }
    setLoading(true);
    setError("");
    api
      .loadSnapshot(session.token, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) commit(result);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          commit(empty);
          setError(api.errorMessage(cause));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    mode,
    session.loading,
    session.authenticated,
    session.anonymous,
    session.configured,
    session.token,
    revision,
    commit,
  ]);
  /* oxlint-enable react/set-state-in-effect */
  function switchMode(next: Mode) {
    if (busy) return;
    epoch.current++;
    commit(next === "demo" ? demo.readDemo() : empty);
    try {
      sessionStorage.setItem("rentaequipos.mode", next);
    } catch {
      /* Mode still updates in memory. */
    }
    setError("");
    setMode(next);
  }
  async function operation(work: () => Promise<void>) {
    if (
      loading ||
      (mode === "api" && !session.authenticated && !session.anonymous)
    )
      throw new Error(
        "El espacio no está listo. Actualizá los datos o iniciá sesión.",
      );
    setBusy((value) => value + 1);
    try {
      await work();
    } finally {
      setBusy((value) => value - 1);
    }
  }
  async function apiMutation<T>(
    request: () => Promise<T>,
    update: (current: Snapshot, result: T) => Snapshot,
  ) {
    const expected = epoch.current;
    const result = await request();
    if (expected !== epoch.current)
      throw new Error(
        "El espacio cambió durante la operación. Actualizá los datos para verificar su resultado.",
      );
    commit((current) => update(current, result));
  }
  const canWrite =
    mode === "demo" ||
    ((session.authenticated || session.anonymous) &&
      session.roles.some((role) =>
        ["Administrador", "Operador"].includes(role),
      ));
  const isAdmin =
    mode === "demo" ||
    ((session.authenticated || session.anonymous) &&
      session.roles.includes("Administrador"));
  const available = useCallback(
    async (start: string, end: string, signal?: AbortSignal) =>
      mode === "demo"
        ? demo.demoAvailable(ref.current, start, end)
        : api.available(start, end, session.token, signal),
    [mode, session.token],
  );
  const value: RentalContextValue = {
    data,
    mode,
    loading,
    error,
    busy,
    canWrite,
    isAdmin,
    switchMode,
    reload: () => {
      if (!busy) setRevision((value) => value + 1);
    },
    reset: () => {
      if (mode === "demo") commit(demo.resetDemo());
    },
    saveEquipo: (input, id) =>
      operation(async () => {
        if (mode === "demo") {
          commit(demo.demoSaveEquipo(ref.current, input, id));
          return;
        }
        await apiMutation(
          () => api.saveEquipo(input, id, session.token),
          (current, item) => ({
            ...current,
            equipos: id
              ? current.equipos.map((e) => (e.id === id ? item : e))
              : [...current.equipos, item],
          }),
        );
      }),
    saveCliente: (input, id) =>
      operation(async () => {
        if (mode === "demo") {
          commit(demo.demoSaveCliente(ref.current, input, id));
          return;
        }
        await apiMutation(
          () => api.saveCliente(input, id, session.token),
          (current, item) => ({
            ...current,
            clientes: id
              ? current.clientes.map((c) => (c.id === id ? item : c))
              : [...current.clientes, item],
          }),
        );
      }),
    createReserva: (input) =>
      operation(async () => {
        if (mode === "demo") {
          commit(demo.demoCreateReserva(ref.current, input));
          return;
        }
        await apiMutation(
          () => api.createReserva(input, session.token),
          (current, item) => ({
            ...current,
            reservas: [...current.reservas, item],
          }),
        );
      }),
    act: (id, action, body) =>
      operation(async () => {
        if (mode === "demo") {
          commit(demo.demoAct(ref.current, id, action, body));
          return;
        }
        await apiMutation(
          () => api.actReserva(id, action, body, session.token),
          (current, result) => ({
            ...current,
            reservas: current.reservas.map((r) =>
              r.id === id ? result.reserva : r,
            ),
            equipos: current.equipos.map((e) =>
              e.id === result.equipo.id ? result.equipo : e,
            ),
          }),
        );
      }),
    setEstado: (id, estado) =>
      operation(async () => {
        if (mode === "demo") {
          commit(demo.demoEstado(ref.current, id, estado));
          return;
        }
        await apiMutation(
          () => api.setEstado(id, estado, session.token),
          (current, item) => ({
            ...current,
            equipos: current.equipos.map((e) => (e.id === id ? item : e)),
          }),
        );
      }),
    remove: (kind, id) =>
      operation(async () => {
        if (mode === "demo") {
          commit(demo.demoRemove(ref.current, kind, id));
          return;
        }
        await apiMutation(
          () => api.removeResource(kind, id, session.token),
          (current) => ({
            ...current,
            [kind]: current[kind].filter((item) => item.id !== id),
          }),
        );
      }),
    available,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
