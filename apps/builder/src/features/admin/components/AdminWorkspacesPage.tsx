"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@typebot.io/ui/components/Button";
import { Skeleton } from "@typebot.io/ui/components/Skeleton";
import { Table } from "@typebot.io/ui/components/Table";
import { Search01Icon } from "@typebot.io/ui/icons/Search01Icon";
import { TriangleAlertIcon } from "@typebot.io/ui/icons/TriangleAlertIcon";
import Link from "next/link";
import { useRef, useState } from "react";
import { orpc } from "@/lib/queryClient";
import { AdminLayout } from "./AdminLayout";
import { PlanBadge } from "./PlanBadge";
import { StatusBadge } from "./StatusBadge";

export const AdminWorkspacesPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const { data, status } = useQuery(
    orpc.admin.listWorkspaces.queryOptions({
      input: { search: debouncedSearch || undefined, take: 50 },
    }),
  );

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Clients</h1>
            <p className="text-sm text-gray-10 mt-0.5">
              All workspaces — {data?.items.length ?? "…"} shown
            </p>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-9 pointer-events-none" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md bg-gray-1 focus:outline-none focus:ring-2 focus:ring-orange-8"
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {status === "pending" ? (
          <div className="flex flex-col gap-2">
            {["a", "b", "c", "d", "e", "f"].map((key) => (
              <Skeleton key={key} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : status === "error" ? (
          <div className="flex items-center gap-2 text-red-11">
            <TriangleAlertIcon className="size-4" />
            <p className="text-sm">Failed to load workspaces</p>
          </div>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Workspace</Table.Head>
                <Table.Head>Plan</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>MRR</Table.Head>
                <Table.Head>AI (this month)</Table.Head>
                <Table.Head>Flags</Table.Head>
                <Table.Head>Bots</Table.Head>
                <Table.Head className="w-0" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data?.items.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    colSpan={8}
                    className="text-center text-gray-10 py-8"
                  >
                    No workspaces found
                  </Table.Cell>
                </Table.Row>
              ) : (
                data?.items.map((workspace) => (
                  <Table.Row key={workspace.id}>
                    <Table.Cell>
                      <div>
                        <p className="font-medium">{workspace.name}</p>
                        <p className="text-xs text-gray-10">{workspace.id}</p>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <PlanBadge plan={workspace.plan} />
                    </Table.Cell>
                    <Table.Cell>
                      {workspace.subscription ? (
                        <StatusBadge status={workspace.subscription.status} />
                      ) : (
                        <span className="text-xs text-gray-9">—</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {workspace.invoices[0]
                        ? `$${Number(workspace.invoices[0].baseAmountUsd).toFixed(2)}`
                        : "—"}
                    </Table.Cell>
                    <Table.Cell>
                      <span
                        className={
                          workspace.currentPeriodAiCostUsd > 0
                            ? "text-orange-11"
                            : ""
                        }
                      >
                        ${workspace.currentPeriodAiCostUsd.toFixed(4)}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-1">
                        {workspace.isPastDue && (
                          <span className="text-xs bg-yellow-3 text-yellow-11 px-1.5 py-0.5 rounded">
                            past due
                          </span>
                        )}
                        {workspace.isQuarantined && (
                          <span className="text-xs bg-red-3 text-red-11 px-1.5 py-0.5 rounded">
                            quarantined
                          </span>
                        )}
                        {workspace.isSuspended && (
                          <span className="text-xs bg-gray-3 text-gray-11 px-1.5 py-0.5 rounded">
                            suspended
                          </span>
                        )}
                        {!workspace.isPastDue &&
                          !workspace.isQuarantined &&
                          !workspace.isSuspended && (
                            <span className="text-xs text-gray-9">—</span>
                          )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>{workspace._count.typebots}</Table.Cell>
                    <Table.Cell>
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/admin/workspaces/${workspace.id}`} />
                        }
                      >
                        View
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
        )}
      </div>
    </AdminLayout>
  );
};
