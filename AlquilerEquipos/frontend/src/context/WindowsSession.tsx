import { useEffect, useState, type ReactNode } from "react";
import { SessionContext, type Session } from "./useSession";
type LocalSession = { name: string; roles: string[]; authentication: string };
async function fetchSession(signal?: AbortSignal): Promise<LocalSession> {
  const response = await fetch("/api/session", {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (!response.ok)
    throw new Error(
      response.status === 403
        ? "Tu cuenta de Windows no está habilitada para este espacio."
        : "No se pudo verificar tu cuenta de Windows. Volvé a intentarlo desde esta PC.",
    );
  const data: unknown = await response.json();
  if (!data || typeof data !== "object")
    throw new Error("Respuesta de sesión inválida.");
  const value = data as Partial<LocalSession>;
  if (
    value.authentication !== "WindowsLocal" ||
    typeof value.name !== "string" ||
    !Array.isArray(value.roles) ||
    !value.roles.every((role) => typeof role === "string")
  )
    throw new Error("El servidor no tiene habilitado el acceso Windows local.");
  return value as LocalSession;
}
export function WindowsSession({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalSession>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    fetchSession(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setUser(result);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const session: Session = {
    configured: true,
    authenticated: !!user,
    anonymous: false,
    loading,
    error,
    name: user?.name || "Cuenta de Windows",
    roles: user?.roles || [],
    windowsLocal: true,
    login: async () => {
      setLoading(true);
      setError(undefined);
      try {
        setUser(await fetchSession());
      } catch (cause) {
        setUser(undefined);
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo verificar la sesión.",
        );
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    // Windows SSO belongs to the OS; locking only clears the application's in-memory session.
    logout: async () => {
      setUser(undefined);
      setError(undefined);
    },
  };
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
