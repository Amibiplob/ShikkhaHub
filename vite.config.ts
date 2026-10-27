import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { validatePublicEnvironment } from "./config/public-environment.ts";

export default defineConfig(({ mode }) => {
  const publicEnvironment = validatePublicEnvironment(loadEnv(mode, process.cwd(), "VITE_"));
  return {
    // No automatic VITE_* exposure, including HTML replacements and env objects.
    // [] means no prefixes; '' would expose everything and is unsafe.
    envPrefix: [],
    define: Object.fromEntries(Object.entries(publicEnvironment).map(([name, value]) =>
      [`import.meta.env.${name}`, JSON.stringify(value)],
    )),
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
