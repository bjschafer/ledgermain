import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Outside <App/>, not inside it: a crash in App's own hooks has to be caught
// too, and that is the case that would otherwise blank the page entirely.
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
