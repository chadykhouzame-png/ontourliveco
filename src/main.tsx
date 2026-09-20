import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/italiana/400.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/600.css";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";
import { HelmetProvider } from "react-helmet-async";

// Initialize Sentry before rendering
initSentry();
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
