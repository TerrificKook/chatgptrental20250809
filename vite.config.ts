import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/chatgptrental20250809/",
  plugins: [react()],
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
