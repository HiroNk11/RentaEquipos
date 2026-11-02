import { createContext, useContext } from "react";
export interface Session {
  configured: boolean;
  loading: boolean;
  authenticated: boolean;
  name: string;
  roles: string[];
  token?: string;
  error?: string;
  anonymous: boolean;
  windowsLocal?: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}
export const SessionContext = createContext<Session | null>(null);
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider missing");
  return value;
}
