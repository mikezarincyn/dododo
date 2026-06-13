/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const entry = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Две страницы: родитель (index) и консоль специалиста (console).
      input: { main: entry("./index.html"), console: entry("./console.html") },
    },
  },
  server: {
    // Dev: проксируем API на FastAPI-бэкенд (один origin в проде).
    proxy: { "/api": "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
