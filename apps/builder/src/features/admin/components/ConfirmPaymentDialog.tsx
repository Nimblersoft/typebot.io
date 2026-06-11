import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@typebot.io/ui/components/Button";
import { Dialog } from "@typebot.io/ui/components/Dialog";
import { useState } from "react";
import { orpc } from "@/lib/queryClient";

type Props = {
  invoice: {
    id: string;
    totalUsd: unknown;
    status: string;
  };
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
};

export const ConfirmPaymentDialog = ({
  invoice,
  workspaceId,
  isOpen,
  onClose,
}: Props) => {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<"BANK_TRANSFER" | "DEUNA">(
    "BANK_TRANSFER",
  );
  const [providerRef, setProviderRef] = useState("");
  const [amount, setAmount] = useState(String(Number(invoice.totalUsd)));

  const confirm = useMutation(
    orpc.invoice.confirmPayment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.admin.getWorkspace.queryOptions({
            input: { workspaceId },
          }).queryKey,
        });
        onClose();
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirm.mutate({
      invoiceId: invoice.id,
      method,
      providerRef: providerRef || undefined,
      amountUsd: Number(amount),
    });
  };

  return (
    <Dialog.Root isOpen={isOpen} onClose={onClose}>
      <Dialog.Popup>
        <Dialog.Title>Confirm payment</Dialog.Title>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Method</span>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-gray-1"
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as "BANK_TRANSFER" | "DEUNA")
              }
            >
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="DEUNA">DeUna</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Amount (USD){" "}
              <span className="text-gray-9 font-normal">
                — invoice total: ${Number(invoice.totalUsd).toFixed(2)}
              </span>
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className="border rounded-md px-3 py-2 text-sm bg-gray-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Reference / transaction ID{" "}
              <span className="text-gray-9 font-normal">(optional)</span>
            </span>
            <input
              className="border rounded-md px-3 py-2 text-sm bg-gray-1"
              placeholder="e.g. transfer number or DeUna order ID"
              value={providerRef}
              onChange={(e) => setProviderRef(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={confirm.isPending}>
              {confirm.isPending ? "Confirming…" : "Confirm payment"}
            </Button>
          </div>
          {confirm.isError && (
            <p className="text-sm text-red-11">{confirm.error.message}</p>
          )}
        </form>
      </Dialog.Popup>
    </Dialog.Root>
  );
};
