(() => {
  "use strict";
  const productionOrigins = new Set(["https://www.pactus.dev.br", "https://pactus.dev.br"]);
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const localDevelopment = location.protocol === "http:" && localHosts.has(location.hostname);
  Object.defineProperty(window, "PactusIsolatedOriginPolicy", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({
      allowParent(value) {
        try {
          const url = new URL(value);
          if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return "";
          if (productionOrigins.has(url.origin)) return url.origin;
          return localDevelopment && url.protocol === "http:" && localHosts.has(url.hostname) ? url.origin : "";
        } catch {
          return "";
        }
      },
    }),
  });
})();
