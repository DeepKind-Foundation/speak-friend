import "../site/styles";
import "../styles/workbench.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WorkbenchPage } from "./WorkbenchPage";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");
createRoot(root).render(
  <StrictMode>
    <WorkbenchPage />
  </StrictMode>,
);
