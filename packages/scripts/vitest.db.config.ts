import { defineProject } from "vitest/config";

// See packages/subscriptions/vitest.db.config.ts for why this is named
// `vitest.db.config.ts` rather than `vitest.config.ts`.
export default defineProject(() => ({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/packages/scripts",
  test: {
    name: "@typebot.io/scripts-db",
    watch: false,
    globals: true,
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    setupFiles: ["./tests/setup.ts"],
    reporters: ["default"],
  },
}));
