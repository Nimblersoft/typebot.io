import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@/app/api/router";

type AdminGetWorkspaceResult = Awaited<
  ReturnType<RouterClient<AppRouter>["admin"]["getWorkspace"]>
>;

export type AdminWorkspace = AdminGetWorkspaceResult;
