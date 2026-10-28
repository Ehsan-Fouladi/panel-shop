import "@fontsource-variable/vazirmatn";
import "@doranjs/ui/styles.css";
import "@doranjs/react/styles.css";
import "@/styles/globals.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
