import { BubbleBlockType } from "@typebot.io/blocks-bubbles/constants";
import type { ContinueChatResponse } from "@typebot.io/chat-api/schemas";
import type {
  SessionState,
  TypebotInSession,
} from "@typebot.io/chat-session/schemas";
import { decryptAndRefreshCredentialsData } from "@typebot.io/credentials/decryptAndRefreshCredentials";
import { getCredentials } from "@typebot.io/credentials/getCredentials";
import type { Credentials } from "@typebot.io/credentials/schemas";
import type {
  ActionHandler,
  LogsStore,
  VariableStore,
} from "@typebot.io/forge/types";
import { forgedBlocks } from "@typebot.io/forge-repository/definitions";
import { forgedBlockHandlers } from "@typebot.io/forge-repository/handlers";
import type { ForgedBlock } from "@typebot.io/forge-repository/schemas";
import { isDefined } from "@typebot.io/lib/utils";
import prisma from "@typebot.io/prisma";
import { Plan } from "@typebot.io/prisma/enum";
import type { SessionStore } from "@typebot.io/runtime-session-store";
import { isOverCeiling } from "@typebot.io/subscriptions/isOverCeiling";
import { deepParseVariables } from "@typebot.io/variables/deepParseVariables";
import {
  type ParseVariablesOptions,
  parseVariables,
} from "@typebot.io/variables/parseVariables";
import type { SetVariableHistoryItem } from "@typebot.io/variables/schemas";
import { getNextBlock } from "../getNextBlock";
import type { ExecuteIntegrationResponse } from "../types";
import { updateVariablesInSession } from "../updateVariablesInSession";

export const executeForgedBlock = async (
  block: ForgedBlock,
  { state, sessionStore }: { state: SessionState; sessionStore: SessionStore },
): Promise<ExecuteIntegrationResponse> => {
  const blockDef = forgedBlocks[block.type];
  if (!blockDef) return { outgoingEdgeId: block.outgoingEdgeId };
  const action = blockDef.actions.find((a) => a.name === block.options?.action);
  const handler = forgedBlockHandlers[block.type]?.find(
    (h) => h.type === "action" && h.actionName === action?.name,
  ) as ActionHandler | undefined;
  if (!block.options || !handler || !action)
    return {
      outgoingEdgeId: block.outgoingEdgeId,
      logs: [
        {
          description: `${block.type} is not configured`,
        },
      ],
    };

  const typebot = state.typebotsQueue[0].typebot;
  if (
    handler?.stream &&
    isNextBubbleTextWithStreamingVar(typebot)(
      block.id,
      action.getStreamVariableId?.(block.options),
    ) &&
    state.isStreamEnabled &&
    !state.whatsApp
  ) {
    return {
      outgoingEdgeId: block.outgoingEdgeId,
      clientSideActions: [
        {
          type: "stream",
          expectsDedicatedReply: true,
          stream: true,
        },
      ],
    };
  }

  let newSessionState = state;
  const setVariableHistory: SetVariableHistoryItem[] = [];

  const variables: VariableStore = {
    get: (id: string) => {
      const variable = newSessionState.typebotsQueue[0].typebot.variables.find(
        (variable) => variable.id === id,
      );
      return variable?.value;
    },
    set: (variables) => {
      const newVariables = variables
        .map((variable) => {
          const existingVariable =
            newSessionState.typebotsQueue[0].typebot.variables.find(
              (v) => variable.id === v.id,
            );
          if (!existingVariable) return;
          return {
            ...existingVariable,
            value: variable.value,
          };
        })
        .filter(isDefined);
      if (!newVariables) return;
      const { newSetVariableHistory, updatedState } = updateVariablesInSession({
        newVariables,
        state: newSessionState,
        currentBlockId: block.id,
      });
      newSessionState = updatedState;
      setVariableHistory.push(...newSetVariableHistory);
    },
    parse: (text: string, params?: ParseVariablesOptions) =>
      parseVariables(text, {
        variables: newSessionState.typebotsQueue[0].typebot.variables,
        sessionStore,
        ...params,
      }),
    list: () => newSessionState.typebotsQueue[0].typebot.variables,
  };
  const logs: NonNullable<ContinueChatResponse["logs"]> = [];
  const logsStore: LogsStore = {
    add: (log) => {
      if (typeof log === "string") {
        logs.push({
          status: "error",
          description: log,
        });
        return;
      }
      logs.push(log);
    },
  };

  let credentialsData: any;
  // Tracks whether this call is using the Nimblerbot-owned internal OpenRouter key
  // (BUSINESS plan, no BYOK credential). Used to decide whether to write LLMUsageLog
  // and enforce the hard ceiling.
  let isInternalAiRouting = false;

  if (blockDef.auth) {
    const noCredsErrorLog = [
      {
        status: "error",
        description: `Could not find credentials for block ${block.type}`,
      },
    ];

    if (!block.options.credentialsId) {
      // 4.2: Inject Nimblerbot-owned internal OpenRouter key for BUSINESS workspaces
      // that have no BYOK credential. Provider identity is hidden from customer UI.
      const internalKey = process.env.INTERNAL_OPENROUTER_API_KEY;
      if (block.type === "open-router" && internalKey) {
        const workspace = await prisma.workspace.findUnique({
          where: { id: state.workspaceId },
          select: { plan: true },
        });
        if (workspace?.plan === Plan.BUSINESS) {
          credentialsData = { apiKey: internalKey };
          isInternalAiRouting = true;
        } else {
          return {
            outgoingEdgeId: block.outgoingEdgeId,
            logs: noCredsErrorLog,
          };
        }
      } else {
        return { outgoingEdgeId: block.outgoingEdgeId, logs: noCredsErrorLog };
      }
    } else {
      const defaultClientEnvKeys =
        "defaultClientEnvKeys" in blockDef.auth
          ? blockDef.auth.defaultClientEnvKeys
          : undefined;

      const credentials = await getCredentials(
        block.options.credentialsId,
        state.workspaceId,
      );

      if (!credentials)
        return {
          outgoingEdgeId: block.outgoingEdgeId,
          logs: noCredsErrorLog,
        };

      credentialsData = await decryptAndRefreshCredentialsData(
        {
          id: block.options.credentialsId,
          type: blockDef.id as Credentials["type"],
          data: credentials.data,
          iv: credentials.iv,
        },
        defaultClientEnvKeys,
      );

      if (!credentialsData)
        return {
          outgoingEdgeId: block.outgoingEdgeId,
          logs: noCredsErrorLog,
        };
    }
  }

  // 4.4: Hard ceiling circuit breaker — block internal AI calls when the workspace
  // has consumed >= aiHardCeilingUsd in the current billing period.
  if (isInternalAiRouting) {
    const ceilingError = await checkAiHardCeiling(state.workspaceId);
    if (ceilingError)
      return {
        outgoingEdgeId: block.outgoingEdgeId,
        logs: [{ status: "error", description: ceilingError }],
      };
  }

  const parsedOptions = deepParseVariables(block.options, {
    variables: newSessionState.typebotsQueue[0].typebot.variables,
    sessionStore,
    removeEmptyStrings: true,
  });

  await handler?.server?.({
    credentials: credentialsData,
    options: parsedOptions,
    variables,
    logs: logsStore,
    sessionStore,
  });

  // 4.1: Write LLMUsageLog after handler resolves. Usage is reported into
  // sessionStore by runChatCompletion. Fire-and-forget — must not crash bot flow.
  const usageReport = sessionStore.getReportedUsage();
  if (usageReport) {
    const typebotId = state.typebotsQueue[0]?.typebot.id;
    prisma.lLMUsageLog
      .create({
        data: {
          workspaceId: state.workspaceId,
          typebotId: typebotId ?? null,
          model: usageReport.modelId,
          provider: usageReport.provider,
          inputTokens: usageReport.inputTokens,
          outputTokens: usageReport.outputTokens,
          totalTokens: usageReport.totalTokens,
          costUsd: usageReport.costUsd,
        },
      })
      .catch(() => undefined);
  }

  const clientSideActions: ExecuteIntegrationResponse["clientSideActions"] = [];

  if (handler?.web?.parseFunction) {
    const codeToExecute = handler.web.parseFunction({
      credentials: credentialsData ?? {},
      options: parsedOptions,
      variables,
      logs: logsStore,
    });
    if (codeToExecute?.content)
      clientSideActions.push({
        type: "codeToExecute",
        codeToExecute,
      });
  }

  return {
    newSessionState,
    outgoingEdgeId: block.outgoingEdgeId,
    logs,
    clientSideActions,
    customEmbedBubble: handler?.web?.displayEmbedBubble
      ? {
          type: "custom-embed",
          content: {
            url: handler.web.displayEmbedBubble.parseUrl({
              credentials: credentialsData ?? {},
              options: parsedOptions,
              variables,
              logs: logsStore,
            }),
            initFunction: handler.web.displayEmbedBubble.parseInitFunction({
              credentials: credentialsData ?? {},
              options: parsedOptions,
              variables,
              logs: logsStore,
            }),
            waitForEventFunction:
              handler.web.displayEmbedBubble.waitForEvent?.parseFunction?.({
                credentials: credentialsData ?? {},
                options: parsedOptions,
                variables,
                logs: logsStore,
              }),
          },
        }
      : undefined,
    newSetVariableHistory: setVariableHistory,
  };
};

// Returns a user-visible error string if the workspace has hit its hard ceiling,
// or null if the call can proceed. aiHardCeilingUsd = null means no ceiling.
const checkAiHardCeiling = async (
  workspaceId: string,
): Promise<string | null> => {
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { aiHardCeilingUsd: true, currentPeriodStart: true },
  });
  if (!subscription?.aiHardCeilingUsd) return null;

  const periodUsage = await prisma.lLMUsageLog.aggregate({
    where: {
      workspaceId,
      createdAt: { gte: subscription.currentPeriodStart },
    },
    _sum: { costUsd: true },
  });

  const periodCostUsd = Number(periodUsage._sum.costUsd ?? 0);
  if (
    isOverCeiling({
      periodCostUsd,
      aiHardCeilingUsd: Number(subscription.aiHardCeilingUsd),
    })
  )
    return "AI usage limit reached for this billing period";

  return null;
};

const isNextBubbleTextWithStreamingVar =
  (typebot: TypebotInSession) =>
  (blockId: string, streamVariableId?: string): boolean => {
    const streamVariable = typebot.variables.find(
      (variable) => variable.id === streamVariableId,
    );
    if (!streamVariable) return false;
    const nextBlock = getNextBlock(blockId, {
      groups: typebot.groups,
      edges: typebot.edges,
    });
    if (!nextBlock) return false;
    return (
      nextBlock.type === BubbleBlockType.TEXT &&
      (nextBlock.content?.richText?.length ?? 0) > 0 &&
      nextBlock.content?.richText?.at(0)?.children.at(0).text ===
        `{{${streamVariable.name}}}`
    );
  };
