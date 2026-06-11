import { auth } from "@typebot.io/auth/lib/nextAuth";
import { isStaff } from "@typebot.io/subscriptions/staff";
import type { GetServerSidePropsContext } from "next";

export default function Page() {
  return null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await auth(context);
  if (!session?.user || !isStaff(session.user))
    return { redirect: { permanent: false, destination: "/typebots" } };
  return { redirect: { permanent: false, destination: "/admin/workspaces" } };
}
