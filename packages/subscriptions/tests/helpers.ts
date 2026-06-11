import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "@typebot.io/prisma/createPrismaAdapter";
import type { Plan } from "@typebot.io/prisma/enum";
import { inject } from "vitest";

// One container-bound client per worker, created lazily so `inject` is only
// read after globalSetup has provided the testcontainer URI.
let client: PrismaClient | undefined;
export const testDb = (): PrismaClient => {
  if (!client)
    client = new PrismaClient({
      adapter: createPrismaAdapter(inject("pgContainerDatabaseUri")),
    });
  return client;
};

export const createTestWorkspace = (plan: Plan = "FREE") =>
  testDb().workspace.create({
    data: { name: `ws-${randomUUID()}`, plan },
  });

const minimalTypebotData = {
  version: "6.1",
  groups: [],
  events: [
    {
      id: "event1",
      type: "start",
      graphCoordinates: { x: 0, y: 0 },
      outgoingEdgeId: "edge1",
    },
  ],
  variables: [{ id: "var1", name: "var1" }],
  edges: [{ id: "edge1", from: { eventId: "event1" }, to: { groupId: "g1" } }],
  theme: {},
  settings: {},
} as const;

export const createTestTypebot = (
  workspaceId: string,
  { isArchived = false }: { isArchived?: boolean } = {},
) =>
  testDb().typebot.create({
    data: {
      workspaceId,
      name: `bot-${randomUUID()}`,
      isArchived,
      ...minimalTypebotData,
      events: minimalTypebotData.events,
    },
  });
