import "../site/styles";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GuidePage } from "./GuidePage";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <GuidePage />
  </StrictMode>,
);
