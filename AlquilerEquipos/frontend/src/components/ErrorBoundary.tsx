import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="connection-empty" role="alert">
          <AlertCircle size={36} />
          <h1>No pudimos mostrar esta pantalla</h1>
          <p>
            Volvé a cargar el espacio. Si el problema continúa, contactá al
            administrador.
          </p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={17} />
            Recargar
          </button>
        </main>
      );
    return this.props.children;
  }
}
