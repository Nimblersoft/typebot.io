import { UsersIcon } from "@typebot.io/ui/icons/UsersIcon";
import { cn } from "@typebot.io/ui/lib/cn";
import Link from "next/link";
import { useRouter } from "next/router";

type Props = {
  children: React.ReactNode;
};

const navItems = [
  { label: "Clients", href: "/admin/workspaces", Icon: UsersIcon },
];

export const AdminLayout = ({ children }: Props) => {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-gray-1">
      <aside className="w-56 border-r flex flex-col shrink-0">
        <div className="px-4 py-5 border-b">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-10">
            Staff console
          </p>
          <p className="text-sm font-medium mt-0.5">Nimblerbot Admin</p>
        </div>
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map(({ label, href, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                router.pathname.startsWith(href)
                  ? "bg-orange-3 text-orange-11 font-medium"
                  : "text-gray-11 hover:bg-gray-3",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Link
            href="/typebots"
            className="text-xs text-gray-10 hover:text-gray-12 transition-colors"
          >
            ← Back to builder
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};
