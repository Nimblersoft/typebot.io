import { cn } from "@typebot.io/ui/lib/cn";

type Status = "ACTIVE" | "IN_GRACE" | "QUARANTINED" | "CANCELED";

const statusStyles: Record<Status, string> = {
  ACTIVE: "bg-green-3 text-green-11",
  IN_GRACE: "bg-yellow-3 text-yellow-11",
  QUARANTINED: "bg-red-3 text-red-11",
  CANCELED: "bg-gray-3 text-gray-10",
};

const statusLabels: Record<Status, string> = {
  ACTIVE: "Active",
  IN_GRACE: "In grace",
  QUARANTINED: "Quarantined",
  CANCELED: "Canceled",
};

export const StatusBadge = ({ status }: { status: Status }) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      statusStyles[status],
    )}
  >
    {statusLabels[status]}
  </span>
);
