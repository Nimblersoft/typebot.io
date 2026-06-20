import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@typebot.io/ui/components/Button";
import { Table } from "@typebot.io/ui/components/Table";
import { ArrowDown01Icon } from "@typebot.io/ui/icons/ArrowDown01Icon";
import { cn } from "@typebot.io/ui/lib/cn";
import { Fragment, useState } from "react";
import { orpc } from "@/lib/queryClient";
import type { AdminWorkspace } from "../types";
import { ConfirmPaymentDialog } from "./ConfirmPaymentDialog";

type Invoice = AdminWorkspace["invoices"][number];
type Payment = Invoice["payments"][number];

type Props = {
  workspaceId: string;
  invoices: Invoice[];
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-3 text-gray-10",
  ISSUED: "bg-blue-3 text-blue-11",
  PAID: "bg-green-3 text-green-11",
  VOID: "bg-gray-3 text-gray-9",
  OVERDUE: "bg-red-3 text-red-11",
};

const paymentStatusStyles: Record<string, string> = {
  PENDING: "bg-blue-3 text-blue-11",
  CONFIRMED: "bg-green-3 text-green-11",
  FAILED: "bg-red-3 text-red-11",
};

export const InvoicesPanel = ({ workspaceId, invoices }: Props) => {
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(
    null,
  );

  const voidInvoice = useMutation(
    orpc.invoice.void.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.admin.getWorkspace.queryOptions({
            input: { workspaceId },
          }).queryKey,
        }),
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-medium">Invoices</h3>
      {invoices.length === 0 ? (
        <p className="text-sm text-gray-10">No invoices yet</p>
      ) : (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Period</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Base</Table.Head>
              <Table.Head>Overage</Table.Head>
              <Table.Head>Total</Table.Head>
              <Table.Head>Due</Table.Head>
              <Table.Head>Paid at</Table.Head>
              <Table.Head className="w-0" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {invoices.map((invoice) => {
              const isExpanded = expandedInvoiceId === invoice.id;
              return (
                <Fragment key={invoice.id}>
                  <Table.Row>
                    <Table.Cell className="text-xs">
                      {formatDate(invoice.periodStart)} –{" "}
                      {formatDate(invoice.periodEnd)}
                    </Table.Cell>
                    <Table.Cell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[invoice.status] ?? ""}`}
                      >
                        {invoice.status}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      ${Number(invoice.baseAmountUsd).toFixed(2)}
                    </Table.Cell>
                    <Table.Cell>
                      {Number(invoice.overageAmountUsd) > 0 ? (
                        <span className="text-orange-11">
                          +${Number(invoice.overageAmountUsd).toFixed(4)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Table.Cell>
                    <Table.Cell className="font-medium">
                      ${Number(invoice.totalUsd).toFixed(2)}
                    </Table.Cell>
                    <Table.Cell className="text-xs">
                      {invoice.dueAt ? formatDate(invoice.dueAt) : "—"}
                    </Table.Cell>
                    <Table.Cell className="text-xs">
                      {invoice.paidAt ? formatDate(invoice.paidAt) : "—"}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-1 items-center">
                        {invoice.payments.length > 0 && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() =>
                              setExpandedInvoiceId(
                                isExpanded ? null : invoice.id,
                              )
                            }
                          >
                            <ArrowDown01Icon
                              className={cn(
                                "transition-transform",
                                isExpanded ? "" : "-rotate-90",
                              )}
                            />
                            {invoice.payments.length} payment
                            {invoice.payments.length > 1 ? "s" : ""}
                          </Button>
                        )}
                        {invoice.status !== "PAID" &&
                          invoice.status !== "VOID" && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              Mark paid
                            </Button>
                          )}
                        {invoice.status !== "VOID" &&
                          invoice.status !== "PAID" && (
                            <Button
                              size="xs"
                              variant="ghost"
                              disabled={voidInvoice.isPending}
                              onClick={() => {
                                if (confirm("Void this invoice?"))
                                  voidInvoice.mutate({ invoiceId: invoice.id });
                              }}
                            >
                              Void
                            </Button>
                          )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                  {isExpanded && (
                    <Table.Row>
                      <Table.Cell colSpan={8} className="bg-gray-2">
                        <PaymentsSubRow payments={invoice.payments} />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Fragment>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}

      {selectedInvoice && (
        <ConfirmPaymentDialog
          invoice={selectedInvoice}
          workspaceId={workspaceId}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

const PaymentsSubRow = ({ payments }: { payments: Payment[] }) => (
  <div className="flex flex-col gap-1.5 py-1">
    {payments.map((payment) => (
      <div
        key={payment.id}
        className="flex items-center gap-3 text-xs text-gray-11"
      >
        <span className="font-medium text-gray-12">{payment.method}</span>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full font-medium",
            paymentStatusStyles[payment.status] ?? "",
          )}
        >
          {payment.status}
        </span>
        <span>${Number(payment.amountUsd).toFixed(2)}</span>
        {payment.providerRef && (
          <span className="text-gray-10">ref: {payment.providerRef}</span>
        )}
        <span className="text-gray-10">
          {payment.confirmedAt
            ? `confirmed ${formatDate(payment.confirmedAt)}`
            : "not confirmed"}
        </span>
      </div>
    ))}
  </div>
);

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
