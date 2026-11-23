// [DX-CON1] Home (DESIGN.md 8.3): what this database is, three ways in, the assistant, and the latest changes.
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnswerLine } from "@/components/console/answer-line";
import { useNewType } from "@/components/console/sheets-context";
import { EmptyState, ErrorAlert } from "@/components/console/states";
import { PageTitle } from "@/components/console/layout";
import { useTool } from "@/hooks/use-tool";
import { useConnection, useTools } from "@/lib/catalogue";
import { n, shortId, time } from "@/lib/format";
import type { Feed, ListTypes, Summary } from "@/lib/types";

export function changesWords(tx: Feed["transactions"][number]) {
  const retracts = tx.changes.filter((c) => c.op === "retract").length;
  const asserts = tx.changes.filter((c) => c.op === "assert").length;
  const entities = [...new Set(tx.changes.map((c) => c.entity))];
  const parts = [retracts && `${retracts} ${retracts === 1 ? "retract" : "retracts"}`, asserts && `${asserts} ${asserts === 1 ? "assert" : "asserts"}`].filter(Boolean);
  const on = entities.length === 1 ? shortId(entities[0]!) : entities.length > 1 ? `${entities.length} entities` : "";
  const hidden = tx.totalChanges > tx.changes.length ? ` (${tx.changes.length} of ${tx.totalChanges} shown)` : "";
  return { counts: parts.join(", ") || "no changes", on, hidden };
}

export function HomePage() {
  const connection = useConnection();
  const tools = useTools();
  const summary = useTool<Summary>("database_summary", {});
  const types = useTool<ListTypes>("list_entity_types", {}, { enabled: tools.has("list_entity_types") });
  const feed = useTool<Feed>("change_feed", { limit: 5 });
  const openNewType = useNewType();
  const firstAccount = connection.data?.roster[2]?.account ?? connection.data?.roster[0]?.account;
  const s = summary.data;

  if (connection.isError)
    return (
      <div className="mx-auto max-w-3xl">
        <PageTitle title="Triplex Console" />
        <EmptyState
          title="Not connected"
          description={
            <>
              Run <code className="font-mono">bash demo/connect.sh</code>, then reload.
            </>
          }
        />
        <div className="mt-4">
          <ErrorAlert
            error={connection.error}
            hint={
              (connection.error as { detail?: { file?: string } }).detail?.file && (
                <div className="font-mono text-xs">Connection file: {(connection.error as { detail?: { file?: string } }).detail?.file}</div>
              )
            }
          />
        </div>
      </div>
    );

  const figures: [string, string | undefined, string | undefined][] = [
    ["Records", s && n(s.recordsAtBringUp), s && `counted at bring-up${s.serverReadyAt ? " " + time(s.serverReadyAt, false).slice(11) : ""}, not live`],
    ["Subjects", s && n(s.subjects), undefined],
    ["Accounts", s && n(s.accounts), undefined],
    ["Head position", s && n(s.head), s && `${n(s.transactionsSinceSeal)} since the seal`],
    [
      "Entity types",
      !tools.has("list_entity_types") ? "not yet" : types.data ? String(types.data.types.length) : undefined,
      types.data?.release ? `in release ${types.data.release.label}` : tools.has("list_entity_types") ? (types.data ? "no release yet" : undefined) : "configuration tools pending",
    ],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitle title="Triplex Console">One Triplex database on Datomic with PostgreSQL storage. {connection.data?.label}.</PageTitle>

      <section className="space-y-2">
        {summary.isError ? (
          <ErrorAlert error={summary.error} onRetry={() => summary.refetch()} />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {figures.map(([label]) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  {figures.map(([label, value, note]) => (
                    <TableCell key={label} className="align-top">
                      {value === undefined ? (
                        <Skeleton className="h-7 w-24" />
                      ) : (
                        <div className="text-2xl font-semibold tabular-nums">{value}</div>
                      )}
                      <div className="text-muted-foreground mt-1 text-xs">{note ?? " "}</div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        <AnswerLine answer={s} call={summary.call} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Start here</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Ask a question</CardTitle>
              <CardDescription>Triplex Datalog on any subject, at any position.</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button asChild>
                <Link to="/query">Open Query</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Browse the data</CardTitle>
              <CardDescription>
                {s ? `${s.accounts} accounts of ${n(Math.round(s.subjects / Math.max(1, s.accounts)))} subjects` : "The accounts and their subjects"}, and the types you
                define.
              </CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button asChild variant="outline" disabled={!firstAccount}>
                <Link to={`/accounts/${firstAccount ?? ""}`}>Open {firstAccount ?? "an account"}</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Define an entity type</CardTitle>
              <CardDescription>Name it, add attributes, commit a release, then add entities from a form.</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button variant="outline" onClick={() => openNewType()}>
                New entity type
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
        <div>
          <h2 className="text-sm font-medium">Ask your assistant the same things</h2>
          <p className="text-muted-foreground mt-1 text-sm">"What did we believe about subject 0 of {firstAccount ?? "account-003"} on 1 June 2025?"</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/assistant">See what to ask</Link>
        </Button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Latest changes</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/journal">Open Journal</Link>
          </Button>
        </div>
        {feed.isError ? (
          <ErrorAlert error={feed.error} onRetry={() => feed.refetch()} />
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Record time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Changed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.isPending
                  ? Array.from({ length: 3 }, (_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 4 }, (_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : [...(feed.data?.transactions ?? [])].reverse().map((tx) => {
                      const w = changesWords(tx);
                      return (
                        <TableRow key={tx.position}>
                          <TableCell className="tabular-nums">{n(tx.position)}</TableCell>
                          <TableCell className="tabular-nums">{time(tx.recordedAt)}</TableCell>
                          <TableCell>{tx.actor ?? "loader"}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{w.on}</span> <span className="text-muted-foreground ml-2 text-xs">{w.counts}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        )}
        <AnswerLine answer={feed.data} call={feed.call} label="Head" />
      </section>
    </div>
  );
}
