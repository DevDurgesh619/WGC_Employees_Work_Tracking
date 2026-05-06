import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    globals: true,
    css: false,
  },
  // Tailwind 4's PostCSS plugin isn't compatible with the vite 5 loader vitest 2 ships.
  // Tests don't need CSS, so disable PostCSS here.
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only ships only as an ESM bundler hint that throws at client
      // import — vitest's resolver doesn't pick it up. Alias to a no-op.
      "server-only": path.resolve(__dirname, "./tests/__shims__/server-only.ts"),
    },
  },
});
