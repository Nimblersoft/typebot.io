import { useQuery } from "@tanstack/react-query";
import { Accordion } from "@typebot.io/ui/components/Accordion";
import { Badge } from "@typebot.io/ui/components/Badge";
import { Skeleton } from "@typebot.io/ui/components/Skeleton";
import { orpc } from "@/lib/queryClient";
import { InvoicePaymentAction } from "./InvoicePaymentAction";

type Props = {
  workspaceId: string;
};

const statusColor: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  PAID: "green",
  VOID: "gray",
  OVERDUE: "red",
};

export const NimblerbotInvoicesList = ({ workspaceId }: Props) => {
  const { data, isLoading } = useQuery(
    orpc.invoice.list.queryOptions({
      input: { workspaceId, take: 12 },
    }),
  );

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  const invoices = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl">Invoices</h3>
      {invoices.length === 0 ? (
        <p className="text-sm text-gray-10">No invoices yet</p>
      ) : (
        <Accordion.Root>
          {invoices.map((invoice) => (
            <Accordion.Item key={invoice.id} value={invoice.id}>
              <Accordion.Trigger>
                <div className="flex flex-1 items-center justify-between pr-2">
                  <span>
                    {formatDate(invoice.periodStart)} –{" "}
                    {formatDate(invoice.periodEnd)}
                  </span>
                  <div className="flex items-center gap-3">
                    <Badge colorScheme={statusColor[invoice.status] ?? "gray"}>
                      {invoice.status}
                    </Badge>
                    <span className="font-medium">
                      ${Number(invoice.totalUsd).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Accordion.Trigger>
              <Accordion.Panel>
                <ul className="flex flex-col gap-1 text-sm">
                  {invoice.lineItems.map((lineItem) => (
                    <li key={lineItem.id} className="flex justify-between">
                      <span className="text-gray-11">
                        {lineItem.description}
                      </span>
                      <span>${Number(lineItem.amountUsd).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-0.5 text-sm text-gray-10">
                  {invoice.dueAt && (
                    <span>Due {formatDate(invoice.dueAt)}</span>
                  )}
                  {invoice.paidAt && (
                    <span>Paid {formatDate(invoice.paidAt)}</span>
                  )}
                </div>
                {invoice.payments.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-sm text-gray-10">
                    {invoice.payments.map((payment) => (
                      <li key={payment.id}>
                        {payment.method} · {payment.status}
                        {payment.confirmedAt
                          ? ` · ${formatDate(payment.confirmedAt)}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
                <InvoicePaymentAction
                  invoiceId={invoice.id}
                  status={invoice.status}
                  totalUsd={Number(invoice.totalUsd)}
                  paymentLink={invoice.paymentLink}
                />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}
    </div>
  );
};

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
