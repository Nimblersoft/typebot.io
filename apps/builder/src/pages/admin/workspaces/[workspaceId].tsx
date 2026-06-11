import { auth } from "@typebot.io/auth/lib/nextAuth";
import { isStaff } from "@typebot.io/subscriptions/staff";
import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { AdminWorkspaceDetailPage } from "@/features/admin/components/AdminWorkspaceDetailPage";

export default function Page() {
  const router = useRouter();
  const workspaceId = router.query.workspaceId?.toString();
  if (!workspaceId) return null;
  return <AdminWorkspaceDetailPage workspaceId={workspaceId} />;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await auth(context);
  if (!session?.user || !isStaff(session.user))
    return { redirect: { permanent: false, destination: "/typebots" } };
  return { props: {} };
}
