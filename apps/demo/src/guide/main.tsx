import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "speak-friend-react/styles.css";
import "../styles/tokens.css";
import "../styles/site.css";
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
