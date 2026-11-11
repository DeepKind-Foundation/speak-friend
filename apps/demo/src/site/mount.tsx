import "./styles";
import { StrictMode, type ReactNode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

/** Shows the page. When the html already holds the pre-rendered page it is hydrated, otherwise it is rendered. */
export function mount(page: ReactNode): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root element");
  const app = <StrictMode>{page}</StrictMode>;
  if (root.hasChildNodes()) hydrateRoot(root, app);
  else createRoot(root).render(app);
}
