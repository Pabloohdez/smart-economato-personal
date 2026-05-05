export function registerServiceWorker(
  currentWindow: Pick<Window, "addEventListener"> | undefined = typeof window !== "undefined" ? window : undefined,
  currentNavigator: (Navigator & { serviceWorker?: ServiceWorkerContainer }) | undefined = typeof navigator !== "undefined" ? navigator : undefined,
  isProd = import.meta.env.PROD,
) {
  if (!currentWindow || !currentNavigator || !("serviceWorker" in currentNavigator)) {
    return;
  }

  // En desarrollo, un SW “viejo” (de producción) puede quedarse controlando el sitio
  // y romper fetches / HMR. Lo desregistramos de forma defensiva.
  if (!isProd) {
    currentWindow.addEventListener("load", () => {
      void currentNavigator.serviceWorker
        ?.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => (typeof caches !== "undefined" ? caches.keys() : Promise.resolve([])))
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {
          // no-op: si falla, no bloqueamos la app
        });
    });
    return;
  }

  currentWindow.addEventListener("load", () => {
    void currentNavigator.serviceWorker?.register("/sw.js");
  });
}