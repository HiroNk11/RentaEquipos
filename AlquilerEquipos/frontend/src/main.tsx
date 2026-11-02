import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./context/Session";
import { RentalProvider } from "./context/Rental";
import { UIProvider } from "./context/UI";
import { Notifications } from "./context/Notifications";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <RentalProvider>
            <Notifications>
              <UIProvider>
                <App />
              </UIProvider>
            </Notifications>
          </RentalProvider>
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
