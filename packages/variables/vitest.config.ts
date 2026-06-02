import { defineProject } from "vitest/config";

export default defineProject(() => ({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/packages/variables",
  test: {
    name: "@typebot.io/variables",
    watch: false,
    globals: true,
    environment: "node",
    include: ["{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    // Dummy values so @typebot.io/env (imported transitively via executeFunction)
    // validates at import time. These tests exercise pure JS sandbox logic and
    // never touch the DB, so no test database/container is required.
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/typebot",
      ENCRYPTION_SECRET: "00000000000000000000000000000000",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_VIEWER_URL: "http://localhost:3001",
    },
  },
}));
