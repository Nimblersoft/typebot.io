import { ORPCError } from "@orpc/server";
import type { Plan } from "@typebot.io/prisma/enum";
import { hasFeature } from "./features";
import type { Feature } from "./tiers";

// Forged blocks whose use is gated behind a plan feature, keyed by the block
// `type` as it appears in a typebot's groups (the forge block id).
const gatedBlocks = [
  { type: "cal-com", feature: "calCom", label: "Cal.com" },
] satisfies ReadonlyArray<{ type: string; feature: Feature; label: string }>;

type GroupWithBlocks = { blocks: ReadonlyArray<{ type: string }> };

// Server-side counterpart to the client block-sidebar gate: rejects saving,
// importing, or publishing a flow that uses a feature-gated block the plan
// isn't entitled to. Closes the paste/import bypass of the sidebar-only gate.
export const assertBlocksEntitled = (
  plan: Plan,
  groups: ReadonlyArray<GroupWithBlocks>,
) => {
  const usedBlockTypes = new Set(
    groups.flatMap((group) => group.blocks.map((block) => block.type)),
  );
  for (const gatedBlock of gatedBlocks)
    if (
      usedBlockTypes.has(gatedBlock.type) &&
      !hasFeature(plan, gatedBlock.feature)
    )
      throw new ORPCError("FORBIDDEN", {
        message: `The ${gatedBlock.label} block requires the Business plan. Upgrade to use it.`,
      });
};
