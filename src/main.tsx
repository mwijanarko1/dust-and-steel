import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { portalBattleStateFromSearch } from "@/app/portalFromSearch";
import { useGameStore } from "@/app/gameStore";
import "@/styles/global.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const portalState = portalBattleStateFromSearch(window.location.search);
if (portalState) {
  useGameStore.setState(portalState);
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
