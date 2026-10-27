import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { validatePublicEnvironment } from "./config/public-environment.ts";

export default defineConfig(({ mode }) => {
  validatePublicEnvironment(loadEnv(mode, process.cwd(), "VITE_"));
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  };
});
