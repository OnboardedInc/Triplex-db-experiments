// [DX-CON1] Journal tab: the transactions that changed this entity, newest first (change_feed with entity). Until the
// server's change_feed takes an entity, the tab reads the newest 200 transactions and says so.
import { AnswerLine } from "@/components/console/answer-line";
import { JournalTable } from "@/components/console/journal-table";
import { ErrorAlert, Slow, TableSkeleton } from "@/components/console/states";
import { useTool } from "@/hooks/use-tool";
import { useTools } from "@/lib/catalogue";
import { useReleaseLabels } from "@/lib/config";
import type { Feed } from "@/lib/types";

export function JournalTab({ entity, entities }: { entity: string; entities: string[] }) {
  const tools = useTools();
  const byEntity = tools.accepts("change_feed", "entity");
  const labels = useReleaseLabels();
  const q = useTool<Feed>("change_feed", byEntity ? { entity, limit: 20 } : { limit: 200 });
  const wanted = new Set(entities);
  const txs = (q.data?.transactions ?? [])
    .map((t) => (byEntity ? t : { ...t, changes: t.changes.filter((c) => wanted.has(c.entity)) }))
    .filter((t) => byEntity || t.changes.length > 0)
    .sort((a, b) => b.position - a.position);
  return (
    <div className="space-y-3">
      <Slow show={q.slow} elapsed={q.elapsed}>
        Reading this entity's journal.
      </Slow>
      {q.isError ? (
        <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <TableSkeleton rows={5} columns={6} />
      ) : (
        <>
          <AnswerLine answer={q.data} call={q.call} label="Head" />
          {!byEntity && (
            <p className="text-muted-foreground text-xs">
              Of the newest 200 transactions in the journal, the ones that changed {entities.length > 1 ? "this subject's entities" : "this entity"}. The
              entity's full journal arrives when the server's change_feed takes an entity.
            </p>
          )}
          <JournalTable labels={labels} transactions={txs} empty={byEntity ? "No transaction changed this entity." : "None of the newest 200 transactions changed it."} />
        </>
      )}
    </div>
  );
}
