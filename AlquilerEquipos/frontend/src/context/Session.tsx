import { type ReactNode } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import { InMemoryWebStorage, WebStorageStateStore } from "oidc-client-ts";
import { useNavigate } from "react-router-dom";
import { SessionContext as Context, type Session } from "./useSession";
import { WindowsSession } from "./WindowsSession";

const anonymous =
  import.meta.env.DEV && import.meta.env.VITE_ALLOW_ANONYMOUS_API === "true";
const fallback: Session = {
  configured: false,
  loading: false,
  authenticated: false,
  name: "Mi espacio",
  roles: anonymous ? ["Administrador"] : [],
  anonymous,
  login: async () => {},
  logout: async () => {},
};
const authority = import.meta.env.VITE_OIDC_AUTHORITY;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID;
function safeAuthority(value: string) {
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.protocol === "https:" ||
        (import.meta.env.DEV &&
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}
const userStore = new WebStorageStateStore({ store: new InMemoryWebStorage() });
function accessClaims(token?: string): Record<string, unknown> {
  try {
    const part = token!.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const decoded: unknown = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(part), (char) => char.charCodeAt(0)),
      ),
    );
    return decoded && typeof decoded === "object" && !Array.isArray(decoded)
      ? (decoded as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
function Bridge({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const roleClaim = import.meta.env.VITE_OIDC_ROLE_CLAIM || "role";
  // Claims only control presentation; the API validates authorization independently.
  const claims = accessClaims(auth.user?.access_token);
  const raw = claims[roleClaim] ?? auth.user?.profile[roleClaim];
  const roles = Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === "string")
    : typeof raw === "string"
      ? [raw]
      : [];
  const value: Session = {
    configured: true,
    loading: auth.isLoading,
    authenticated: auth.isAuthenticated,
    name: String(
      auth.user?.profile.name ||
        auth.user?.profile.preferred_username ||
        "Mi cuenta",
    ),
    roles,
    token: auth.user?.access_token,
    anonymous: false,
    error: auth.error ? "No se pudo completar el inicio de sesión." : undefined,
    login: () =>
      auth.signinRedirect({
        state: { returnTo: window.location.pathname + window.location.search },
      }),
    logout: async () => {
      try {
        await auth.signoutRedirect();
      } catch {
        await auth.removeUser();
      }
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  if (
    import.meta.env.VITE_WINDOWS_LOCAL === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
  )
    return <WindowsSession>{children}</WindowsSession>;
  if (!authority || !clientId || !safeAuthority(authority))
    return <Context.Provider value={fallback}>{children}</Context.Provider>;
  return (
    <AuthProvider
      authority={authority}
      client_id={clientId}
      redirect_uri={
        import.meta.env.VITE_OIDC_REDIRECT_URI || window.location.origin + "/"
      }
      post_logout_redirect_uri={window.location.origin + "/"}
      response_type="code"
      scope={import.meta.env.VITE_OIDC_SCOPE || "openid profile"}
      automaticSilentRenew
      userStore={userStore}
      stateStore={new WebStorageStateStore({ store: window.sessionStorage })}
      extraQueryParams={
        import.meta.env.VITE_OIDC_AUDIENCE
          ? { audience: import.meta.env.VITE_OIDC_AUDIENCE }
          : undefined
      }
      onSigninCallback={(user) => {
        let target = "/";
        const state = user?.state as { returnTo?: unknown } | undefined;
        if (typeof state?.returnTo === "string") {
          try {
            const url = new URL(state.returnTo, window.location.origin);
            if (
              url.origin === window.location.origin &&
              [
                "/",
                "/equipos",
                "/reservas",
                "/clientes",
                "/disponibilidad",
              ].includes(url.pathname)
            )
              target = url.pathname + url.search;
          } catch {
            /* Ignore invalid return paths. */
          }
        }
        void navigate(target, { replace: true });
      }}
    >
      <Bridge>{children}</Bridge>
    </AuthProvider>
  );
}
