// [DX-CON1] Triplex Console dev server. The console talks only to the page server's tool catalogue, so the dev server
// proxies /api to it. Default target is the page server on 127.0.0.1:28580; set CONSOLE_API to use another port.
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const reserved = [15442, 17019, 5432, 6379, 4222, 4566, 16686];
const api = process.env["CONSOLE_API"] ?? "http://127.0.0.1:28580";
if (reserved.some((p) => api.endsWith(`:${p}`))) throw new Error("Reserved port");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    host: "127.0.0.1",
    port: 28581,
    strictPort: true,
    proxy: {
      "/api": {
        target: api,
        changeOrigin: false,
        // The page server accepts a changing request only with the console's own Origin. Through the dev proxy the
        // browser's Origin is the dev server's, so it is rewritten to the page server's own.
        configure: (proxy) => proxy.on("proxyReq", (req) => req.setHeader("origin", api)),
      },
    },
  },
  build: { outDir: "dist", chunkSizeWarningLimit: 2000 },
});
