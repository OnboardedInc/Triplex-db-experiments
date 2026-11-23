// [DX-CON1] Journal (DESIGN.md 8.10): the ordered change feed, Live, "After position N", and "Changed since" (which
// subjects to look at again). The journal always reads current.
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { AnswerLine } from "@/components/console/answer-line";
import { AskAssistant } from "@/components/console/ask-assistant";
import { DataTable } from "@/components/console/data-table";
import { JournalTable } from "@/components/console/journal-table";
import { PageTitle } from "@/components/console/layout";
import { EmptyState, ErrorAlert, TableSkeleton } from "@/components/console/states";
import { useTool } from "@/hooks/use-tool";
import { callTool } from "@/lib/api";
import { useConnection, useTools } from "@/lib/catalogue";
import { n, parseLoaderId, shortId } from "@/lib/format";
import type { Feed } from "@/lib/types";

const LIVE_MS = 5000;
const ALL = "all";

type ChangedRow = { key: string; account: string; subject: number | null; entity: string; transactions: number; facts: number; lastPosition: number };

function ChangedSince({ open, onOpenChange, after }: { open: boolean; onOpenChange: (v: boolean) => void; after: number }) {
  const tools = useTools();
  const [state, setState] = useState<{ rows: ChangedRow[]; read: number; pages: number; stopped: boolean; serverMs: number; position: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const bySummary = tools.accepts("change_feed", "summary");
  const run = async () => {
    setRunning(true);
    setError(null);
    setState(null);
    try {
      if (bySummary) {
        const a = await callTool<Feed>("change_feed", { after, summary: true, limit: 200 });
        const s = a.summary!;
        setState({
          rows: s.subjects.map((x) => ({ key: `${x.account}/${x.subject}`, account: x.account, subject: x.subject, entity: "", transactions: x.transactions, facts: x.facts, lastPosition: x.lastPosition })),
          read: s.transactionsRead,
          pages: 0,
          stopped: Boolean(s.stoppedEarly),
          serverMs: a.timing.serverMs ?? 0,
          position: a.position,
        });
      } else {
        // The summary computed here from the feed's own pages: at most 10 pages of 200 transactions.
        const map = new Map<string, ChangedRow>();
        let cursor = after;
        let read = 0;
        let pages = 0;
        let serverMs = 0;
        let position = 0;
        let stopped = false;
        for (;;) {
          const a = await callTool<Feed>("change_feed", { after: cursor, limit: 200 });
          pages++;
          serverMs += a.timing.serverMs ?? 0;
          position = a.position;
          read += a.transactions.length;
          for (const tx of a.transactions) {
            const seen = new Set<string>();
            for (const c of tx.changes) {
              const p = parseLoaderId(c.entity);
              const key = p ? `${p.account}/${p.subject}` : c.entity;
              const row = map.get(key) ?? { key, account: p?.account ?? "", subject: p?.subject ?? null, entity: p ? "" : c.entity, transactions: 0, facts: 0, lastPosition: 0 };
              row.facts++;
              if (!seen.has(key)) row.transactions++;
              seen.add(key);
              row.lastPosition = Math.max(row.lastPosition, tx.position);
              map.set(key, row);
            }
          }
          if (!a.next || a.transactions.length === 0 || a.next <= cursor) break;
          if (pages >= 10) {
            stopped = true;
            break;
          }
          cursor = a.next;
        }
        setState({ rows: [...map.values()].sort((x, y) => y.lastPosition - x.lastPosition), read, pages, stopped, serverMs, position });
      }
    } catch (e) {
      setError(e);
    } finally {
      setRunning(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) void run();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Changed since position {n(after)}</DialogTitle>
          <DialogDescription>Which subjects and entities to look at again: the one whole-database question this engine answers.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <AskAssistant call={{ name: "change_feed", input: bySummary ? { after, summary: true } : { after, limit: 200 } }} sentence={`Who changed since position ${n(after)}?`} />
        </div>
        {running ? (
          <div className="flex items-center gap-2 text-sm">
            <Spinner /> Reading the journal after position {n(after)}.
          </div>
        ) : error ? (
          <ErrorAlert error={error} onRetry={run} />
        ) : state ? (
          <div className="space-y-2">
            <p className="text-sm" data-testid="changed-since">
              {n(state.read)} transactions read{state.pages ? ` in ${state.pages} ${state.pages === 1 ? "page" : "pages"}` : ""}, {n(state.rows.filter((r) => r.subject !== null).length)} subjects and{" "}
              {n(state.rows.filter((r) => r.subject === null).length)} other entities changed. Head {n(state.position)}. Store {state.serverMs.toFixed(2)} ms in total.
              {state.stopped && " Stopped after 10 pages; ask again from the last position shown."}
            </p>
            <DataTable
              dense
              rowKey={(r) => r.key}
              data={state.rows}
              empty={`No transactions after position ${n(after)}.`}
              columns={[
                {
                  id: "subject",
                  header: "Subject or entity",
                  accessorFn: (r) => r.key,
                  cell: (c) =>
                    c.row.original.subject !== null ? (
                      <Link className="hover:underline" to={`/accounts/${c.row.original.account}/subjects/${c.row.original.subject}`} onClick={() => onOpenChange(false)}>
                        {c.row.original.account} / {c.row.original.subject}
                      </Link>
                    ) : (
                      <Link className="font-mono text-xs hover:underline" to={`/entities/${encodeURIComponent(c.row.original.entity)}`} onClick={() => onOpenChange(false)}>
                        {shortId(c.row.original.entity)}
                      </Link>
                    ),
                },
                { accessorKey: "transactions", header: "Transactions", cell: (c) => <span className="tabular-nums">{n(c.row.original.transactions)}</span> },
                { accessorKey: "facts", header: "Facts changed", cell: (c) => <span className="tabular-nums">{n(c.row.original.facts)}</span> },
                { accessorKey: "lastPosition", header: "Last position", cell: (c) => <span className="tabular-nums">{n(c.row.original.lastPosition)}</span> },
              ]}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function JournalPage() {
  const [params, setParams] = useSearchParams();
  const connection = useConnection().data;
  const after = params.get("after") && /^\d+$/.test(params.get("after")!) ? Number(params.get("after")) : undefined;
  const account = params.get("account") ?? ALL;
  const actor = params.get("actor") ?? ALL;
  const [live, setLive] = useState(true);
  const [afterDraft, setAfterDraft] = useState(after !== undefined ? String(after) : "");
  const [changed, setChanged] = useState(false);
  const q = useTool<Feed>(
    "change_feed",
    { after, account: account === ALL ? undefined : account, limit: 20 },
    { refetchInterval: live && after === undefined ? LIVE_MS : false, keepPrevious: true },
  );
  const set = (p: Record<string, string | undefined>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(p)) v === undefined || v === ALL ? next.delete(k) : next.set(k, v);
      return next;
    });
  const all = q.data?.transactions ?? [];
  const actors = [...new Set(all.map((t) => t.actor ?? "loader"))].sort();
  const txs = all.filter((t) => actor === ALL || (t.actor ?? "loader") === actor);
  const shown = after === undefined ? [...txs].sort((a, b) => b.position - a.position) : txs;
  const sinceDefault = after ?? connection?.sealed?.head ?? 0;
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle
        title="Journal"
        actions={
          <>
            <div className="flex items-center gap-2">
              <Switch id="live" checked={live && after === undefined} disabled={after !== undefined} onCheckedChange={setLive} data-testid="live" />
              <Label htmlFor="live">Live: {live && after === undefined ? "on" : "off"}</Label>
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                set({ after: afterDraft || undefined });
              }}
            >
              <Label htmlFor="after" className="text-sm whitespace-nowrap">
                After position
              </Label>
              <Input id="after" className="h-8 w-32 tabular-nums" value={afterDraft} onChange={(e) => setAfterDraft(e.target.value.replace(/[^\d]/g, ""))} placeholder={String(sinceDefault)} />
              <Button size="sm" variant="outline" type="submit">
                Go
              </Button>
            </form>
            <Button size="sm" onClick={() => setChanged(true)} data-testid="changed-since-open">
              Changed since
            </Button>
          </>
        }
      >
        The ordered, resumable change feed of the whole database.
      </PageTitle>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Account</span>
        <Select value={account} onValueChange={(v) => set({ account: v })}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>all</SelectItem>
            {connection?.roster.map((r) => (
              <SelectItem key={r.account} value={r.account}>
                {r.account}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm">Actor</span>
        <Select value={actor} onValueChange={(v) => set({ actor: v })}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>all</SelectItem>
            {[...new Set([...actors, "console", "assistant"])].map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {after !== undefined && (
          <Button variant="ghost" size="sm" onClick={() => (setAfterDraft(""), set({ after: undefined }))}>
            Back to the newest
          </Button>
        )}
        {live && after === undefined && (
          <Badge variant="outline" className="font-normal">
            reads the head every {LIVE_MS / 1000} s
          </Badge>
        )}
      </div>
      {q.isError ? (
        <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <>
          <AnswerLine
            answer={q.data}
            call={q.call}
            label="Head"
            extra={<span className="text-muted-foreground">{n(q.data?.transactions.length ?? 0)} transactions read</span>}
          />
          {account !== ALL && <p className="text-muted-foreground text-xs">The account filter keeps the transactions that changed {account}'s entities, and only those changes.</p>}
          {shown.length === 0 ? (
            <EmptyState title={after !== undefined ? `No transactions after position ${n(after)}.` : "No transactions."} />
          ) : (
            <JournalTable transactions={shown} />
          )}
          {after !== undefined && q.data?.next && q.data.next > after && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => (setAfterDraft(String(q.data!.next)), set({ after: String(q.data!.next) }))}>
                Next page after {n(q.data.next)}
              </Button>
            </div>
          )}
          {q.data?.compatibility && <p className="text-muted-foreground text-xs">Positions up to {n(connection?.sealed.head)} were written by the bulk loader. {q.data.compatibility}</p>}
        </>
      )}
      <ChangedSince open={changed} onOpenChange={setChanged} after={after ?? Number(afterDraft || sinceDefault)} />
    </div>
  );
}
