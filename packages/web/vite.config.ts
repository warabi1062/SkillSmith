import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// dev 時に /api を転送する先の API サーバーポート
const apiPort = Number(process.env.SKILLSMITH_API_PORT ?? 5174);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist/spa",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
