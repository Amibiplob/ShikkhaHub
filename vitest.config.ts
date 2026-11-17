import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  envDir: false,
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("http://127.0.0.1:54321"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("isolated-ci-public-key"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "config/**/*.test.ts",
      "e2e/staging/settings.test.ts",
      "supabase/functions/_shared/*.test.ts",
    ],
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
