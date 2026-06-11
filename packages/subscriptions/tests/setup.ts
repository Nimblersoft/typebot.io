import { inject } from "vitest";

// The @typebot.io/prisma singleton builds its client from DATABASE_URL at import
// time. Point it at the shared testcontainer so importing engine functions
// (which import the singleton) doesn't crash before our injected client is used.
process.env.DATABASE_URL = inject("pgContainerDatabaseUri");
