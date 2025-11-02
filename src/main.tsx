import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => {
        // Service worker registered successfully (silent in production)
      })
      .catch((error) => {
        // Only log errors in development
        if (import.meta.env.DEV) {
          console.warn('Service worker registration failed:', error);
        }
      });
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

// 🔴 DEBUG BREAKPOINT: Set a breakpoint here to inspect root element creation
const root = createRoot(rootElement);
// 🔴 DEBUG BREAKPOINT: Set a breakpoint here before app rendering to inspect initial state
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
