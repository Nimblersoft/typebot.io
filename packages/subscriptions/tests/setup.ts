import { inject } from "vitest";

// The @typebot.io/prisma singleton builds its client from DATABASE_URL at import
// time. Point it at the shared testcontainer so importing engine functions
// (which import the singleton) doesn't crash before our injected client is used.
process.env.DATABASE_URL = inject("pgContainerDatabaseUri");

// Some api helpers (e.g. assertWorkspaceMember → staff) import @typebot.io/env,
// which validates a few required vars at import time. Provide dummy values so
// those imports don't throw under the test runner.
process.env.ENCRYPTION_SECRET ??= "0".repeat(32);
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_VIEWER_URL ??= "http://localhost:3001";
