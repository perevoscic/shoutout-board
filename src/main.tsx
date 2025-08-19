import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import faviconPng from "./assets/favicon.png";

// Ensure the favicon points to our PNG asset during dev and build
const ensureFavicon = (href: string) => {
  const head = document.head;
  let link = head.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    head.appendChild(link);
  }
  link.type = "image/png";
  link.href = href;
};

ensureFavicon(faviconPng);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
