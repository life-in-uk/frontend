import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// Keep environment-specific routing out of the browser application.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "BANK_HOLIDAYS_");
  const backendTarget = env.BANK_HOLIDAYS_API_TARGET || "http://127.0.0.1:8080";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api/travel/underground": {
          target: backendTarget,
        },
        "/api/travel/roads": {
          target: backendTarget,
        },
        "/api/places/search": {
          target: backendTarget,
        },
        "/api/guides": {
          target: backendTarget,
        },
        "/api/bank-holidays": {
          target: backendTarget,
        },
      },
    },
  };
});
