const envReady = window.RUN_NERDS_ENV_READY || Promise.resolve();

envReady.then(async () => {
  const { initApp } = await import("./js/app-main.js");
  initApp();

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    });
  }
});
