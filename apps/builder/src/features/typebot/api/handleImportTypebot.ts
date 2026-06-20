import { ORPCError } from "@orpc/server";
import { createId } from "@paralleldrive/cuid2";
import { copyObjects } from "@typebot.io/lib/s3/copyObjects";
import { replaceTypebotUploadUrlsWithNewIds } from "@typebot.io/lib/s3/replaceTypebotUploadUrlsWithNewIds";
import prisma from "@typebot.io/prisma";
import { Plan } from "@typebot.io/prisma/enum";
import { assertBlocksEntitled } from "@typebot.io/subscriptions/assertBlocksEntitled";
import { getTypebotsLimit } from "@typebot.io/subscriptions/getTypebotsLimit";
import { isOverBotLimit } from "@typebot.io/subscriptions/isOverBotLimit";
import { isPlanEntitledForTemplate } from "@typebot.io/subscriptions/isPlanEntitledForTemplate";
import { trackEvents } from "@typebot.io/telemetry/trackEvents";
import { templates as templatesData } from "@typebot.io/templates";
import { migrateTypebot } from "@typebot.io/typebot/migrations/migrateTypebot";
import { preprocessTypebot } from "@typebot.io/typebot/preprocessTypebot";
import {
  resultsTablePreferencesSchema,
  type Typebot,
  type TypebotV6,
  typebotV5Schema,
  typebotV6Schema,
} from "@typebot.io/typebot/schemas/typebot";
import type { User } from "@typebot.io/user/schemas";
import { z } from "zod";
import { getUserModeInWorkspace } from "@/features/workspace/helpers/getUserRoleInWorkspace";
import {
  sanitizeFolderId,
  sanitizeGroups,
  sanitizeSettings,
  sanitizeVariables,
} from "../helpers/sanitizers";

const omittedProps = {
  id: true,
  whatsAppCredentialsId: true,
  riskLevel: true,
  isClosed: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  customDomain: true,
  workspaceId: true,
  resultsTablePreferences: true,
  selectedThemeTemplateId: true,
  publicId: true,
  spaceId: true,
} as const;

const importingTypebotSchema = z.preprocess(
  preprocessTypebot,
  z.discriminatedUnion("version", [
    typebotV6Schema.omit(omittedProps).extend({
      resultsTablePreferences: resultsTablePreferencesSchema.nullish(),
      selectedThemeTemplateId: z.string().nullish(),
      workspaceId: z.string().optional(),
      id: z.string().optional(),
    }),
    typebotV5Schema.omit(omittedProps).extend({
      resultsTablePreferences: resultsTablePreferencesSchema.nullish(),
      selectedThemeTemplateId: z.string().nullish(),
      workspaceId: z.string().optional(),
      id: z.string().optional(),
    }),
  ]),
);

type ImportingTypebot = z.infer<typeof importingTypebotSchema>;

const migrateImportingTypebot = async (
  typebot: ImportingTypebot,
): Promise<TypebotV6> => {
  const fullTypebot = {
    ...typebot,
    id: "dummy id",
    workspaceId: "dummy workspace id",
    resultsTablePreferences: typebot.resultsTablePreferences ?? null,
    selectedThemeTemplateId: typebot.selectedThemeTemplateId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customDomain: null,
    isClosed: false,
    isArchived: false,
    whatsAppCredentialsId: null,
    publicId: null,
    riskLevel: null,
    spaceId: null,
  } satisfies Partial<Typebot>;
  return (await migrateTypebot(fullTypebot)).typebot;
};

export const importTypebotInputSchema = z.object({
  workspaceId: z
    .string()
    .describe(
      "[Where to find my workspace ID?](../how-to#how-to-find-my-workspaceid)",
    ),
  typebot: importingTypebotSchema,
  fromTemplate: z.string().optional(),
  enableSafetyFlags: z.boolean().optional(),
});

export const handleImportTypebot = async ({
  input: { typebot, workspaceId, fromTemplate, enableSafetyFlags },
  context: { user },
}: {
  input: z.infer<typeof importTypebotInputSchema>;
  context: { user: Pick<User, "id"> };
}) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, members: true, plan: true },
  });
  const userRole = getUserModeInWorkspace(user.id, workspace?.members);
  if (userRole === "guest" || !workspace)
    throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

  if (fromTemplate) {
    const template = templatesData.find((t) => t.name === fromTemplate);
    if (
      template &&
      !isPlanEntitledForTemplate(workspace.plan, template.requiredPlan)
    )
      throw new ORPCError("FORBIDDEN", {
        message:
          "This template requires a higher plan. Upgrade to Business to use it.",
      });
  }

  const limit = getTypebotsLimit(workspace.plan);
  if (limit !== "inf") {
    const typebotCount = await prisma.typebot.count({
      where: { workspaceId, isArchived: { not: true } },
    });
    if (isOverBotLimit(limit, typebotCount))
      throw new ORPCError("BAD_REQUEST", {
        message: `You have reached the bot limit for your plan (${limit} bot${limit === 1 ? "" : "s"}). Upgrade to Business to create more.`,
      });
  }

  const newBotId = createId();

  const newUploadUrlsResponse = await replaceTypebotUploadUrlsWithNewIds({
    typebot,
    newTypebotId: newBotId,
    newWorkspaceId: workspaceId,
  });

  const duplicatingBot = await migrateImportingTypebot(
    newUploadUrlsResponse.typebot,
  );

  if (duplicatingBot.groups)
    assertBlocksEntitled(workspace.plan, duplicatingBot.groups);

  const groups = (
    duplicatingBot.groups
      ? await sanitizeGroups(duplicatingBot.groups, {
          workspace,
          enableSafetyFlags,
        })
      : []
  ) as TypebotV6["groups"];

  const newTypebot = await prisma.typebot.create({
    data: {
      id: newBotId,
      version: duplicatingBot.version,
      workspaceId,
      name: duplicatingBot.name,
      icon: duplicatingBot.icon,
      selectedThemeTemplateId: duplicatingBot.selectedThemeTemplateId,
      groups,
      events: duplicatingBot.events ?? undefined,
      theme: duplicatingBot.theme ? duplicatingBot.theme : {},
      settings: duplicatingBot.settings
        ? sanitizeSettings(duplicatingBot.settings, workspace.plan, "create")
        : workspace.plan === Plan.FREE
          ? {
              general: {
                isBrandingEnabled: true,
              },
            }
          : {},
      folderId: await sanitizeFolderId({
        folderId: duplicatingBot.folderId,
        workspaceId: workspace.id,
      }),
      variables: duplicatingBot.variables
        ? sanitizeVariables({
            variables: duplicatingBot.variables,
            groups,
          })
        : [],
      edges: duplicatingBot.edges ?? [],
      resultsTablePreferences:
        duplicatingBot.resultsTablePreferences ?? undefined,
    } satisfies Partial<TypebotV6>,
  });

  const parsedNewTypebot = typebotV6Schema.parse(newTypebot);

  await copyObjects(newUploadUrlsResponse.filesToCopy);

  await trackEvents([
    {
      name: "Typebot created",
      workspaceId: parsedNewTypebot.workspaceId,
      typebotId: parsedNewTypebot.id,
      userId: user.id,
      data: {
        template: fromTemplate,
      },
    },
  ]);

  return { typebot: parsedNewTypebot };
};
