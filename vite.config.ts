import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { validatePublicEnvironment } from "./config/public-environment.ts";

export default defineConfig(({ mode }) => {
  const publicKey = validatePublicEnvironment(loadEnv(mode, process.cwd(), "VITE_"));
  return {
    // Normalize the supported alias once for the SDK and both Edge HTTP callers.
    define: {
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicKey),
    },
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
