import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "ort-public-static",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url && req.url.startsWith("/ort/") && req.url.includes("?")) {
            req.url = req.url.split("?")[0] || req.url;
          }
          next();
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
});
