// [DX-CON1] Configuration (DESIGN.md 8.11): releases and refs, compare two releases, move live. It always reads the
// current configuration. The console never says "Publish": it says Commit release and Move live.
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnswerLine } from "@/components/console/answer-line";
import { DataTable, Mono } from "@/components/console/data-table";
import { PageTitle } from "@/components/console/layout";
import { useSheets } from "@/components/console/sheets-context";
import {
  EmptyState,
  ErrorAlert,
  NotInCatalogue,
  Refused,
  Slow,
  TableSkeleton,
} from "@/components/console/states";
import { useTool, useToolMutation } from "@/hooks/use-tool";
import { useTools } from "@/lib/catalogue";
import { useDescribedTypes } from "@/lib/config";
import { receiptToast } from "@/lib/receipt";
import type { ListReleases, MoveLive, Release, ReleaseRef } from "@/lib/types";

const short = (id?: string | null) => (id ? id.slice(0, 15) + "..." : "none");

function RefLine({ name, r }: { name: string; r: ReleaseRef | null }) {
  return (
    <span className="mr-6 inline-flex items-center gap-2">
      <Badge variant={name === "live" ? "default" : "secondary"}>{name}</Badge>
      {r ? (
        <>
          {r.label} <Mono className="text-muted-foreground">({short(r.id)})</Mono>
        </>
      ) : (
        <span className="text-muted-foreground">not set</span>
      )}
    </span>
  );
}

function Objects({ types }: { types: string[] }) {
  const described = useDescribedTypes(types);
  const rows = described.flatMap((d) =>
    d.data
      ? [
          {
            kind: "entity-schema",
            key: d.data.type.name,
            revision: d.data.type.revisions.at(-1)?.revision ?? "",
            history: d.data.type.revisions
              .map((r) => `${r.sequence} ${r.release} ${r.change}`)
              .join("; "),
          },
          ...d.data.type.attributes.map((a) => ({
            kind: "attribute",
            key: a.key,
            revision: "",
            history: `used by ${d.data!.type.name}`,
          })),
        ]
      : [],
  );
  if (described.some((d) => d.isPending)) return <TableSkeleton />;
  return (
    <div className="space-y-2">
      <DataTable
        dense
        rowKey={(r) => r.kind + r.key + r.history}
        data={rows}
        columns={[
          {
            accessorKey: "kind",
            header: "Kind",
            cell: (c) => <Badge variant="outline">{c.row.original.kind}</Badge>,
          },
          { accessorKey: "key", header: "Key", cell: (c) => <Mono>{c.row.original.key}</Mono> },
          {
            accessorKey: "revision",
            header: "Current revision",
            cell: (c) => (
              <Mono>
                {c.row.original.revision ? c.row.original.revision.slice(0, 18) + "..." : ""}
              </Mono>
            ),
          },
          { accessorKey: "history", header: "Revision history" },
        ]}
      />
      <p className="text-muted-foreground text-xs">
        The logical objects of the release live points to, read through describe_entity_type for
        each type.
      </p>
    </div>
  );
}

export function ConfigurationPage() {
  const tools = useTools();
  const sheets = useSheets();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "releases";
  const compare = params.get("compare")?.split(",") as [string, string] | undefined;
  const q = useTool<ListReleases>(
    "list_releases",
    { limit: 20, compare },
    { enabled: tools.has("list_releases"), keepPrevious: true },
  );
  const move = useToolMutation<MoveLive>("move_live");
  const [confirm, setConfirm] = useState<Release | null>(null);
  const [moved, setMoved] = useState<MoveLive | null>(null);
  if (tools.isSuccess && !tools.has("list_releases"))
    return <NotInCatalogue tool="list_releases" what="Configuration" />;
  const live = q.data?.refs.live;
  const columns: ColumnDef<Release, unknown>[] = [
    {
      accessorKey: "sequence",
      header: "Sequence",
      cell: (c) => <span className="tabular-nums">{c.row.original.sequence}</span>,
    },
    {
      accessorKey: "label",
      header: "Label",
      cell: (c) => <span className="font-medium">{c.row.original.label}</span>,
    },
    {
      accessorKey: "id",
      header: "Release ID",
      cell: (c) => <Mono>{short(c.row.original.id)}</Mono>,
    },
    {
      accessorKey: "parent",
      header: "Parent",
      cell: (c) => <Mono>{short(c.row.original.parent)}</Mono>,
    },
    {
      accessorKey: "objects",
      header: "Objects",
      cell: (c) => <span className="tabular-nums">{c.row.original.objects}</span>,
    },
    { id: "types", header: "Types", cell: (c) => c.row.original.types?.join(", ") },
    {
      id: "refs",
      header: "Refs",
      cell: (c) => (
        <span className="space-x-1">
          {c.row.original.refs.map((r) => (
            <Badge key={r} variant={r === "live" ? "default" : "secondary"}>
              {r}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (c) => (
        <span className="flex justify-end gap-1">
          {live && c.row.original.id !== live.id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setParams({ compare: `${c.row.original.id},${live.id}` })}
            >
              Compare
            </Button>
          )}
          {!c.row.original.refs.includes("live") && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setConfirm(c.row.original)}
              disabled={!tools.has("move_live")}
              data-testid="move-live"
            >
              Move live here
            </Button>
          )}
        </span>
      ),
    },
  ];
  const a = compare && q.data?.releases.find((r) => r.id === compare[0]);
  const b = compare && q.data?.releases.find((r) => r.id === compare[1]);
  const diff = q.data?.difference;
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle
        title="Configuration"
        actions={<Button onClick={() => sheets.openNewType()}>New entity type</Button>}
      >
        Releases of the whole configuration, immutable and content-addressed; test and live are
        refs.
      </PageTitle>
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t })}>
        <TabsList>
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="objects">Objects</TabsTrigger>
        </TabsList>
        <TabsContent value="releases" className="mt-4 space-y-4">
          <Slow show={q.slow} elapsed={q.elapsed}>
            Reading the configuration from the refs.
          </Slow>
          {q.isError ? (
            <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
          ) : q.isPending ? (
            <TableSkeleton />
          ) : !q.data?.releases.length ? (
            <EmptyState title="No release yet.">
              <Button onClick={() => sheets.openNewType()}>New entity type</Button>
            </EmptyState>
          ) : (
            <>
              <div className="text-sm">
                <span className="text-muted-foreground mr-3">Refs</span>
                <RefLine name="live" r={q.data.refs.live} />
                <RefLine name="test" r={q.data.refs.test} />
              </div>
              <AnswerLine answer={q.data} call={q.call} label="Head" />
              <DataTable columns={columns} data={q.data.releases} dense rowKey={(r) => r.id} />
              {q.data.total !== undefined && q.data.total > q.data.releases.length && (
                <p className="text-muted-foreground text-xs">
                  The newest {q.data.releases.length} of {q.data.total} releases.
                </p>
              )}
              {moved && (
                <div className="rounded-md border p-3 text-sm" data-testid="moved">
                  <div className="font-medium">
                    live moved from {moved.before?.label ?? "none"} to {moved.after.label}
                  </div>
                  <div>
                    Types before: {moved.typesBefore.join(", ") || "none"}. Types after:{" "}
                    {moved.typesAfter.join(", ") || "none"}.
                  </div>
                  <div className="text-muted-foreground">{moved.note}</div>
                </div>
              )}
              {compare && (
                <div className="space-y-2 rounded-md border p-3" data-testid="compare">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {a?.label ?? short(compare[0])} compared with {b?.label ?? short(compare[1])}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setParams({})}>
                      Close
                    </Button>
                  </div>
                  {diff && diff.length ? (
                    <table className="text-sm">
                      <tbody>
                        {diff.map((d, i) => (
                          <tr key={i}>
                            <td className="w-24 py-0.5">
                              <Badge variant="outline">{d.change}</Badge>
                            </td>
                            <td className="pr-3">{d.kind}</td>
                            <td className="font-mono text-xs">{d.key}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-muted-foreground text-sm">No object differs.</p>
                  )}
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Moving live changes the release that new writes are pinned to. It changes no fact
                and no earlier receipt.
              </p>
            </>
          )}
          {move.error && (move.error as { code?: string }).code === "AlreadyLive" ? (
            <Refused reason={(move.error as Error).message} />
          ) : move.error && /Conflict/.test((move.error as { code?: string }).code ?? "") ? (
            <ErrorAlert
              error={new Error("live moved while you were looking. Reload.")}
              onRetry={() => q.refetch()}
            />
          ) : move.error ? (
            <ErrorAlert error={move.error} />
          ) : null}
        </TabsContent>
        <TabsContent value="objects" className="mt-4">
          {q.data ? (
            <Objects types={q.data.releases.find((r) => r.refs.includes("live"))?.types ?? []} />
          ) : (
            <TableSkeleton />
          )}
        </TabsContent>
      </Tabs>
      <AlertDialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move live to {confirm?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              live points to {live?.label}. After the move, new typed writes are pinned to{" "}
              {confirm?.label}, whose types are {confirm?.types?.join(", ") || "none"}. No fact and
              no earlier receipt changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-move"
              onClick={() =>
                confirm &&
                move.mutate(
                  { snapshotId: confirm.id },
                  {
                    onSuccess: (answer) => {
                      setMoved(answer);
                      receiptToast(answer as never, `live moved to ${answer.after.label}`, () =>
                        navigate("/journal"),
                      );
                    },
                  },
                )
              }
            >
              Move live
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
