"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".localhost");

    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      (window.location.protocol === "https:" || isLocalhost)
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA Service Worker registrado con éxito:", registration.scope);
          })
          .catch((error) => {
            console.warn("Fallo en el registro del PWA Service Worker:", error);
          });
      });
    }
  }, []);

  return null;
}
