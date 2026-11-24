// [DX-CON1] Journal (DESIGN.md 8.10): the ordered change feed, Live, "After position N", and "Changed since" (which
// subjects to look at again). The journal always reads current.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { AnswerLine } from "@/components/console/answer-line";
import { DataTable } from "@/components/console/data-table";
import { JournalTable } from "@/components/console/journal-table";
import { PageTitle } from "@/components/console/layout";
import {
  EmptyState,
  ErrorAlert,
  NotInCatalogue,
  RecordClockNote,
  TableSkeleton,
  Slow,
} from "@/components/console/states";
import { useTool } from "@/hooks/use-tool";
import { useReleaseLabels } from "@/lib/config";
import { callTool, type Answer } from "@/lib/api";
import { useConnection, useTools } from "@/lib/catalogue";
import { n, parseLoaderId, plural } from "@/lib/format";
import type { Feed, FeedSummary } from "@/lib/types";

const LIVE_MS = 5000;
const ALL = "all";

function subjectLink(root: string | null) {
  if (!root) return null;
  const p = parseLoaderId(root);
  return p && /^pl:\d{8}$/.test(p.local)
    ? `/accounts/${p.account}/subjects/${p.subject}`
    : `/entities/${encodeURIComponent(root)}`;
}

function ChangedSince({
  open,
  onOpenChange,
  after,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  after: number;
}) {
  const tools = useTools();
  const [state, setState] = useState<Answer<FeedSummary> | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const supported = tools.accepts("change_feed", "summary");
  const run = async () => {
    setRunning(true);
    setError(null);
    setState(null);
    try {
      setState(await callTool<FeedSummary>("change_feed", { after, summary: true }));
    } catch (e) {
      setError(e);
    } finally {
      setRunning(false);
    }
  };
  useEffect(() => {
    if (open && supported) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, after, supported]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Changed since position {n(after)}</DialogTitle>
          <DialogDescription>
            Which subjects to look at again: the one whole-database question this engine answers,
            from the ordered journal.
          </DialogDescription>
        </DialogHeader>
        {!supported ? (
          <NotInCatalogue tool="change_feed with summary" what="Changed since" />
        ) : running ? (
          <div className="flex items-center gap-2 text-sm">
            <Spinner /> Reading the journal after position {n(after)}.
          </div>
        ) : error ? (
          <ErrorAlert error={error} onRetry={run} />
        ) : state ? (
          <div className="space-y-2">
            <AnswerLine
              answer={state}
              call={{ name: "change_feed", input: { after, summary: true } }}
              label="Head"
              sentence={`Who changed since position ${n(after)}?`}
            />
            <p className="text-sm" data-testid="changed-since">
              {n(state.transactionsRead)} transactions read in {plural(state.pages, "page")},{" "}
              {plural(state.subjectsChanged, "subject")} changed.
              {!state.complete &&
                " Stopped after the page limit; ask again from the last position shown."}
            </p>
            <DataTable
              dense
              rowKey={(r) => r.subject}
              data={state.subjects}
              empty={`No transactions after position ${n(after)}.`}
              columns={[
                {
                  accessorKey: "subject",
                  header: "Subject",
                  cell: (c) => {
                    const to = subjectLink(c.row.original.root);
                    return to ? (
                      <Link className="hover:underline" to={to} onClick={() => onOpenChange(false)}>
                        {c.row.original.subject}
                      </Link>
                    ) : (
                      <span>{c.row.original.subject}</span>
                    );
                  },
                },
                {
                  accessorKey: "transactions",
                  header: "Transactions",
                  cell: (c) => (
                    <span className="tabular-nums">{n(c.row.original.transactions)}</span>
                  ),
                },
                {
                  accessorKey: "factsChanged",
                  header: "Facts changed",
                  cell: (c) => (
                    <span className="tabular-nums">{n(c.row.original.factsChanged)}</span>
                  ),
                },
                {
                  accessorKey: "lastPosition",
                  header: "Last position",
                  cell: (c) => (
                    <span className="tabular-nums">{n(c.row.original.lastPosition)}</span>
                  ),
                },
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
  const after =
    params.get("after") && /^\d+$/.test(params.get("after")!)
      ? Number(params.get("after"))
      : undefined;
  const account = params.get("account") ?? ALL;
  const actor = params.get("actor") ?? ALL;
  const [live, setLive] = useState(true);
  const [afterDraft, setAfterDraft] = useState(after !== undefined ? String(after) : "");
  const [changed, setChanged] = useState(false);
  const tools = useTools();
  const longPoll = tools.accepts("change_feed", "waitMs");
  const serverActor = tools.accepts("change_feed", "actor");
  const isLive = live && after === undefined;
  const q = useTool<Feed>(
    "change_feed",
    {
      after,
      account: account === ALL ? undefined : account,
      actor: serverActor && actor !== ALL ? actor : undefined,
      limit: 20,
    },
    {
      refetchInterval: isLive && !longPoll && tools.isSuccess ? LIVE_MS : false,
      keepPrevious: true,
    },
  );
  const head = q.data?.position;
  // Live: a long poll on the journal route (waitMs), restarted whenever a transaction arrives.
  useEffect(() => {
    if (!isLive || !longPoll || head === undefined) return;
    const ctrl = new AbortController();
    let stopped = false;
    void (async () => {
      while (!stopped) {
        try {
          const a = await callTool<Feed>(
            "change_feed",
            { after: head, waitMs: 25_000, limit: 1 },
            ctrl.signal,
          );
          if (a.transactions.length) {
            if (!stopped) void q.refetch();
            return;
          }
        } catch {
          if (!stopped) await new Promise((r) => setTimeout(r, LIVE_MS));
        }
      }
    })();
    return () => {
      stopped = true;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, longPoll, head]);
  const set = (p: Record<string, string | undefined>) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(p))
        v === undefined || v === ALL ? next.delete(k) : next.set(k, v);
      return next;
    });
  const labels = useReleaseLabels();
  const all = q.data?.transactions ?? [];
  const actors = [...new Set(all.map((t) => t.actor ?? "bulk import"))].sort();
  const txs = all.filter((t) => actor === ALL || (t.actor ?? "bulk import") === actor);
  const shown = after === undefined ? [...txs].sort((a, b) => b.position - a.position) : txs;
  const sinceDefault = after ?? connection?.sealed?.head ?? 0;
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle
        title="Journal"
        actions={
          <>
            <div className="flex items-center gap-2">
              <Switch
                id="live"
                checked={live && after === undefined}
                disabled={after !== undefined}
                onCheckedChange={setLive}
                data-testid="live"
              />
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
              <Input
                id="after"
                className="h-8 w-32 tabular-nums"
                value={afterDraft}
                onChange={(e) => setAfterDraft(e.target.value.replace(/[^\d]/g, ""))}
                placeholder={String(sinceDefault)}
              />
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (setAfterDraft(""), set({ after: undefined }))}
          >
            Back to the newest
          </Button>
        )}
        {isLive && (
          <Badge variant="outline" className="font-normal">
            {longPoll
              ? "waits for the next transaction (long poll, 25 s at a time)"
              : `reads the head every ${LIVE_MS / 1000} s`}
          </Badge>
        )}
      </div>
      <Slow show={q.slow && !q.data} elapsed={q.elapsed}>
        Reading the journal.
      </Slow>
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
            extra={
              <span className="text-muted-foreground">
                {n(q.data?.transactions.length ?? 0)} transactions read
              </span>
            }
          />
          {account !== ALL && (
            <p className="text-muted-foreground text-xs">
              The account filter keeps the transactions that changed {account}'s entities, and only
              those changes.
            </p>
          )}
          {shown.length === 0 ? (
            <EmptyState
              title={
                after !== undefined
                  ? `No transactions after position ${n(after)}.`
                  : "No transactions."
              }
            />
          ) : (
            <JournalTable transactions={shown} labels={labels} />
          )}
          {after !== undefined && q.data?.next && q.data.next > after && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (
                  setAfterDraft(String(q.data!.next)), set({ after: String(q.data!.next) })
                )}
              >
                Next page after {n(q.data.next)}
              </Button>
            </div>
          )}
          <RecordClockNote
            first={connection?.recordTimeRange?.first}
            last={connection?.recordTimeRange?.lastAtBringUp}
          />
          {q.data?.compatibility && (
            <p className="text-muted-foreground text-xs">
              Positions up to {n(connection?.sealed.head)} are the bulk import that built this
              database. The Journal lists the changes made after it; the import wrote its own change
              records in a form that would mean paging through every one of them.
            </p>
          )}
        </>
      )}
      <ChangedSince
        open={changed}
        onOpenChange={setChanged}
        after={after ?? Number(afterDraft || sinceDefault)}
      />
    </div>
  );
}
