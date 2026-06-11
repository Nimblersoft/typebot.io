import { inject } from "vitest";

// The @typebot.io/prisma singleton builds its client from DATABASE_URL at import
// time. Point it at the shared testcontainer so importing the cron jobs (which
// import the singleton) doesn't crash before our injected client is used.
process.env.DATABASE_URL = inject("pgContainerDatabaseUri");

// The cron jobs import the emails package, which eagerly validates server env
// vars via @typebot.io/env. Provide the same throwaway values the repo's
// pre-commit test command uses so validation passes (no email is ever sent —
// the test workspaces have no admin members).
process.env.ENCRYPTION_SECRET ??= "12345678901234567890123456789012";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_VIEWER_URL ??= "http://localhost:3001";
