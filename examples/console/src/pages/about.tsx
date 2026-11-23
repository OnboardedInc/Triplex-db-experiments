// [DX-CON1] About this database (DESIGN.md 8.13): Identity, Limits, Measured results. Every number not produced by the
// request on screen carries a "Recorded" badge with its date and source.
import { useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnswerLine } from "@/components/console/answer-line";
import { DataTable, Mono } from "@/components/console/data-table";
import { PageTitle } from "@/components/console/layout";
import { EmptyState, ErrorAlert } from "@/components/console/states";
import { limits, type Limit } from "@/data/limits";
import { useTool } from "@/hooks/use-tool";
import { useConnection } from "@/lib/catalogue";
import { n, time } from "@/lib/format";
import type { Summary } from "@/lib/types";

type Measured = {
  version: string;
  note?: string;
  rows: {
    group: string;
    measure: string;
    value: string;
    bar?: string;
    verdict?: string;
    date?: string;
    source?: { branch?: string; commit?: string; file?: string };
    note?: string;
  }[];
};
// demo/measured.json belongs to the functions side; it is read at build time when it exists.
const measuredFiles = import.meta.glob<{ default: Measured }>("../../../../demo/measured.json", {
  eager: true,
});
const measured: Measured | undefined = Object.values(measuredFiles)[0]?.default;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="text-muted-foreground w-64 align-top">{label}</TableCell>
      <TableCell className="align-top whitespace-normal break-words">{children}</TableCell>
    </TableRow>
  );
}

function Identity() {
  const connection = useConnection();
  const summary = useTool<Summary>("database_summary", {});
  const c = connection.data;
  const s = summary.data;
  if (connection.isError) return <ErrorAlert error={connection.error} />;
  if (!c) return <Skeleton className="h-64" />;
  const mem = (s?.memory ?? (c["memory"] as Record<string, unknown> | undefined)) as
    | Record<string, Record<string, unknown>>
    | undefined;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableBody>
            <Row label="Database">{c.label ?? c.kind}</Row>
            <Row label="Database ID">
              <Mono>{c.database}</Mono>
            </Row>
            <Row label="Records">
              <span className="tabular-nums">{n(c.recordsAtBringUp)}</span>, counted by a fresh peer
              at bring-up
              {c["readyAt"] ? ` (${time(c["readyAt"] as string, false)})` : ""}, plus{" "}
              {s ? n(s.transactionsSinceSeal) : "..."} transactions since the seal. {s?.note}
            </Row>
            <Row label="Records at the seal">
              <span className="tabular-nums">{n(c.sealed.records)}</span>
            </Row>
            <Row label="Subjects and accounts">
              {n(c.subjects ?? c.roster.reduce((a, r) => a + r.people, 0))} subjects in{" "}
              {c.roster.length} accounts
            </Row>
            <Row label="Sealed head">
              <span className="tabular-nums">{n(c.sealed.head)}</span>
            </Row>
            <Row label="Head at bring-up">
              <span className="tabular-nums">{n(c.headAtBringUp)}</span>
            </Row>
            <Row label="Live head">
              {s ? (
                <span className="tabular-nums">{n(s.head)}</span>
              ) : (
                <Skeleton className="h-5 w-20" />
              )}
            </Row>
            <Row label="Record-time range">
              {time(c.recordTimeRange?.first)} to {time(c.recordTimeRange?.lastAtBringUp)} at
              bring-up (UTC).{" "}
              <span className="text-muted-foreground">{s?.recordTimeRange?.note}</span>
            </Row>
            <Row label="Working copy">
              {c.workingCopy
                ? "Yes: changes are real commits on a byte copy; the original is never started."
                : "No: changes are refused."}
              {c["workingCopyMadeAt"] ? ` Made ${time(c["workingCopyMadeAt"] as string)}.` : ""}
            </Row>
            <Row label="Pinned-read options">
              {c.pinnedReads
                ? `shortcut ${c.pinnedReads.shortcut ? "on" : "off"}, cut lookup ${c.pinnedReads.cutLookup ? "on" : "off"}`
                : "not recorded"}
            </Row>
            {c.loaderPositionRows && (
              <Row label="Loader compatibility">
                {s?.compatibility ??
                  "The loader's journal position rows are read with a named compatibility option."}
              </Row>
            )}
            {mem && (
              <Row label="Server memory settings">
                <div className="space-y-0.5 text-xs">
                  {Object.entries(mem)
                    .filter(([, v]) => v && typeof v === "object")
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="font-medium">{k}</span>:{" "}
                        {Object.entries(v)
                          .map(
                            ([a, b]) =>
                              `${a} ${typeof b === "object" ? JSON.stringify(b) : String(b)}`,
                          )
                          .join(", ")}
                      </div>
                    ))}
                  {typeof mem["profile"] === "string" && (
                    <div>profile: {String(mem["profile"])}</div>
                  )}
                </div>
              </Row>
            )}
            <Row label="Connection file">
              <Mono>{c.file ?? "~/.triplex-demo/connection.json"}</Mono>
            </Row>
          </TableBody>
        </Table>
      </div>
      {summary.isError ? (
        <ErrorAlert error={summary.error} />
      ) : (
        <AnswerLine answer={s} call={summary.call} />
      )}
    </div>
  );
}

const limitColumns: ColumnDef<Limit, unknown>[] = [
  {
    accessorKey: "what",
    header: "What",
    cell: (c) => <span className="font-medium">{c.row.original.what}</span>,
  },
  { accessorKey: "here", header: "Here" },
  {
    id: "recorded",
    header: "Recorded",
    cell: ({ row }) =>
      row.original.recorded ? (
        <div className="space-y-1">
          <div className="tabular-nums">{row.original.recorded}</div>
          <Badge variant="outline" className="font-normal">
            Recorded{row.original.where ? `: ${row.original.where}` : ""}
          </Badge>
        </div>
      ) : null,
  },
  {
    accessorKey: "gap",
    header: "Gap",
    cell: (c) => <Badge variant="secondary">{c.row.original.gap}</Badge>,
  },
];

function Limits() {
  return (
    <div className="space-y-2">
      <DataTable
        columns={limitColumns}
        data={limits}
        rowKey={(r) => r.gap + r.what}
        renderExpanded={(r) => (
          <div className="grid gap-1 p-3 text-sm md:grid-cols-[10rem_1fr]">
            <span className="text-muted-foreground">What it blocks</span>
            <span>{r.blocks}</span>
            <span className="text-muted-foreground">Smallest change</span>
            <span>{r.lift}</span>
            <span className="text-muted-foreground">Kind of work</span>
            <span>{r.kind}</span>
          </div>
        )}
      />
      <p className="text-muted-foreground text-xs">
        Select a row for what the gap blocks and the smallest change that would lift it.
      </p>
    </div>
  );
}

const measuredColumns: ColumnDef<Measured["rows"][number], unknown>[] = [
  {
    accessorKey: "measure",
    header: "Measure",
    cell: (c) => <span className="font-medium">{c.row.original.measure}</span>,
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: (c) => <span className="tabular-nums">{c.row.original.value}</span>,
  },
  { accessorKey: "bar", header: "Bar" },
  {
    accessorKey: "verdict",
    header: "Bar met",
    cell: (c) =>
      c.row.original.verdict ? (
        <Badge variant={c.row.original.verdict === "met" ? "secondary" : "outline"}>
          {c.row.original.verdict}
        </Badge>
      ) : null,
  },
  {
    id: "source",
    header: "Recorded",
    cell: ({ row }) => (
      <div className="space-y-1">
        <Badge variant="outline" className="font-normal">
          Recorded {row.original.date}
        </Badge>
        {row.original.source && (
          <div className="text-muted-foreground font-mono text-[11px] break-all">
            {row.original.source.commit} {row.original.source.file}
          </div>
        )}
      </div>
    ),
  },
];

function MeasuredResults() {
  if (!measured)
    return (
      <EmptyState
        title="measured.json could not be read."
        description="The recorded results file (demo/measured.json) is not in this build."
      />
    );
  const groups = [...new Set(measured.rows.map((r) => r.group))];
  return (
    <div className="space-y-6">
      {measured.note && <p className="text-muted-foreground text-sm">{measured.note}</p>}
      {groups.map((g) => (
        <div key={g} className="space-y-2">
          <h3 className="text-sm font-medium">{g}</h3>
          <DataTable
            columns={measuredColumns}
            data={measured.rows.filter((r) => r.group === g)}
            renderExpanded={(r) =>
              r.note ? (
                <div className="p-3 text-sm">{r.note}</div>
              ) : (
                <div className="text-muted-foreground p-3 text-sm">No note.</div>
              )
            }
          />
        </div>
      ))}
    </div>
  );
}

export function AboutPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "identity";
  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="About this database">
        What you are connected to, what is refused or slow, and what was measured.
      </PageTitle>
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t })}>
        <TabsList>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="measured">Measured results</TabsTrigger>
        </TabsList>
        <TabsContent value="identity" className="mt-4">
          <Identity />
        </TabsContent>
        <TabsContent value="limits" className="mt-4">
          <Limits />
        </TabsContent>
        <TabsContent value="measured" className="mt-4">
          <MeasuredResults />
        </TabsContent>
      </Tabs>
    </div>
  );
}
