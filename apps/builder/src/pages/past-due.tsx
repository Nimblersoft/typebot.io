import { Button } from "@typebot.io/ui/components/Button";
import { useOpenControls } from "@typebot.io/ui/hooks/useOpenControls";
import { TriangleAlertIcon } from "@typebot.io/ui/icons/TriangleAlertIcon";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { useUser } from "@/features/user/hooks/useUser";
import { WorkspaceSettingsDialog } from "@/features/workspace/components/WorkspaceSettingsDialog";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";

export default function Page() {
  const { replace } = useRouter();
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const { isOpen, onOpen, onClose } = useOpenControls();

  useEffect(() => {
    if (!workspace || workspace.isPastDue) return;
    replace(workspace.id ? `/w/${workspace.id}/typebots` : "/typebots");
  }, [replace, workspace]);

  return (
    <>
      <DashboardHeader />
      <div className="flex flex-col items-center w-full h-[calc(100vh - 64px)] justify-center gap-4 text-center max-w-md mx-auto">
        <TriangleAlertIcon className="size-10" />
        <h2>Your workspace has an unpaid invoice.</h2>
        <p className="text-gray-11">
          Pay it by bank transfer or DeUna to keep your bots running. You have a
          7-day grace period — after that bots stop answering until payment is
          confirmed.
        </p>
        {user && workspace && (
          <>
            <Button onClick={onOpen}>View invoice & pay</Button>
            <WorkspaceSettingsDialog
              isOpen={isOpen}
              onClose={onClose}
              user={user}
              workspace={workspace}
              defaultTab="billing"
            />
          </>
        )}
      </div>
    </>
  );
}
