import { defineProject } from "vitest/config";

// Named `vitest.db.config.ts` (not `vitest.config.ts`) on purpose: the
// @nx/vite plugin only infers a `test` target from files named exactly
// vite(st).config.*, so this file stays invisible to it and keeps
// `bunx nx test @typebot.io/subscriptions` pointed at the bun pure-test script.
// The shared root runner (`bunx nx test`) still picks it up via its projects
// glob, giving these specs the Postgres testcontainer + globalSetup.
export default defineProject(() => ({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/packages/subscriptions",
  test: {
    name: "@typebot.io/subscriptions-db",
    watch: false,
    globals: true,
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    setupFiles: ["./tests/setup.ts"],
    reporters: ["default"],
  },
}));
