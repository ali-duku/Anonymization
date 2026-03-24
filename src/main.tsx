import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppPage } from "./pages/AppPage/AppPage";
import { DisplaySettingsProvider } from "./features/settings/hooks/useDisplaySettings";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DisplaySettingsProvider>
      <AppPage />
    </DisplaySettingsProvider>
  </StrictMode>
);
