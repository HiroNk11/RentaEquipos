import { createContext, useContext } from "react";
export const NotificationContext = createContext<
  ((message: string, error?: boolean) => void) | null
>(null);
export function useNotify() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("Notifications missing");
  return value;
}
