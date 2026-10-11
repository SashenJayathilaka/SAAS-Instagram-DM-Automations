import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./lib/test-server-only.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
