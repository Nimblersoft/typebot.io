import { ORPCError } from "@orpc/server";
import { authenticatedProcedure } from "@typebot.io/config/orpc/builder/middlewares";
import { isStaff } from "../staff";

export const staffProcedure = authenticatedProcedure.use(
  ({ next, context }) => {
    if (!isStaff(context.user)) {
      throw new ORPCError("FORBIDDEN", {
        message: "Staff access required",
      });
    }
    return next({ context });
  },
);
