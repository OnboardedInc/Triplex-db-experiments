// [DX-CON1] Both time axes tab: three views of one date side by side (read_subject_at): now, true then as known now,
// and believed at an earlier record time or exact position.
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnswerLine } from "@/components/console/answer-line";
import { Mono } from "@/components/console/data-table";
import { EmptyState, ErrorAlert, NotInCatalogue, TableSkeleton } from "@/components/console/states";
import { useTool } from "@/hooks/use-tool";
import { useConnection, useTools } from "@/lib/catalogue";
import { n, shortId } from "@/lib/format";
import { beforeLastChange } from "@/lib/session";
import type { AtView, Fact, ReadAt } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Target } from "./model";

const ALL = "__all__";

export function TimeTab({
  target,
  facts,
  entity,
  attribute,
  at,
  believed,
  onChange,
}: {
  target: Target;
  facts: Fact[];
  entity: string;
  attribute?: string;
  at?: string;
  believed?: string;
  onChange: (p: Record<string, string | undefined>) => void;
}) {
  const tools = useTools();
  const connection = useConnection().data;
  const ns = target.account ? `acct/${target.account}/` : "";
  const attributes = [...new Set(facts.filter((f) => f.entity === entity).map((f) => f.attribute))].sort();
  const chosen = attribute && attributes.includes(attribute) ? attribute : undefined;
  const fallbackBelieved = beforeLastChange() ?? connection?.sealed?.head;
  const believedText = believed ?? (fallbackBelieved !== undefined ? String(fallbackBelieved) : "");
  const [dateDraft, setDateDraft] = useState(at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [believedDraft, setBelievedDraft] = useState(believedText);
  const date = at?.slice(0, 10) ?? dateDraft;
  const position = /^\d+$/.test(believedText) ? Number(believedText) : undefined;
  const recordedAt = position === undefined && believedText && !Number.isNaN(Date.parse(believedText)) ? new Date(believedText).toISOString() : undefined;
  const input = {
    account: target.account,
    subject: target.subject,
    at: new Date(date + "T12:00:00Z").toISOString(),
    attribute: chosen ?? attributes[0],
    position: tools.accepts("read_subject_at", "position") ? position : undefined,
    recordedAt,
  };
  const q = useTool<ReadAt>("read_subject_at", input, { enabled: target.subject !== undefined && Boolean(input.attribute) });
  if (target.subject === undefined) return <NotInCatalogue tool="read_entity_at" what="Both time axes for this entity" />;

  const d = q.data;
  const pick = (list: AtView[] | undefined) => (list ?? []).filter((f) => f.entity === shortId(entity, ns) || f.entity === entity);
  const views = d ? { now: pick(d.current), then: pick(d.trueThenAsKnownNow), believed: pick(d.believedThen) } : undefined;
  const values = (list: AtView[] | undefined) => (list?.length ? list.map((f) => String(f.value)).join(", ") : "no value");
  const differs = views && (values(views.now) !== values(views.then) || values(views.then) !== values(views.believed));
  const dayWords = new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">Attribute</span>
        <Select value={chosen ?? attributes[0] ?? ALL} onValueChange={(a) => onChange({ attribute: a })}>
          <SelectTrigger className="h-8 w-64 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {attributes.map((a) => (
              <SelectItem key={a} value={a} className="font-mono text-xs">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm">Valid on</span>
        <Input
          type="date"
          className="h-8 w-40"
          value={dateDraft}
          onChange={(e) => {
            setDateDraft(e.target.value);
            if (e.target.value) onChange({ at: e.target.value });
          }}
        />
        <span className="text-sm">Believed at</span>
        <Input
          className="h-8 w-44 tabular-nums"
          value={believedDraft}
          placeholder="position or record time"
          onChange={(e) => setBelievedDraft(e.target.value)}
          onBlur={() => onChange({ believed: believedDraft || undefined })}
          onKeyDown={(e) => e.key === "Enter" && onChange({ believed: believedDraft || undefined })}
        />
        <span className="text-muted-foreground text-xs">a position, or a record time inside the database's range</span>
      </div>
      {q.isError ? (
        <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <TableSkeleton rows={3} columns={4} />
      ) : !views ? (
        <EmptyState title="Choose an attribute." />
      ) : (
        <>
          <AnswerLine answer={d} call={q.call} />
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56" />
                  <TableHead>Now</TableHead>
                  <TableHead>True on {dayWords}, as known now</TableHead>
                  <TableHead>
                    Believed at {position !== undefined ? `position ${n(position)}` : (d?.believedAsRecordedAt ?? "").slice(0, 16).replace("T", " ")} about {dayWords}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell>
                    <Mono>{input.attribute}</Mono>
                  </TableCell>
                  {[views.now, views.then, views.believed].map((v, i) => (
                    <TableCell key={i} className={cn("text-base", differs && i === 2 && values(v) !== values(views.then) && "font-semibold")}>
                      <Mono className="text-sm">{values(v)}</Mono>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">Recorded</TableCell>
                  <TableCell className="tabular-nums">latest ({n(d!.position)})</TableCell>
                  <TableCell className="tabular-nums">latest ({n(d!.position)})</TableCell>
                  <TableCell className="tabular-nums">{position !== undefined ? n(position) : (d?.believedAsRecordedAt ?? "")}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">Facts in each view (whole subject)</TableCell>
                  <TableCell className="tabular-nums">{n(d!.counts.current)}</TableCell>
                  <TableCell className="tabular-nums">{n(d!.counts.trueThenAsKnownNow)}</TableCell>
                  <TableCell className="tabular-nums">{n(d!.counts.believedThen)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-sm">
            {differs ? "The views differ for this attribute." : "The three views agree for this attribute."} Across the subject,{" "}
            {n(d!.differences.length)} of {n(Math.max(d!.counts.current, d!.counts.trueThenAsKnownNow, d!.counts.believedThen))} facts differ between the
            three views. The three reads ran in one tool call; its store time is the sum.
          </p>
          {d!.counts.believedThen === 0 && (
            <p className="text-muted-foreground text-xs">
              Nothing was recorded yet at that record time. This database's record time runs from {connection?.recordTimeRange?.first?.slice(0, 16).replace("T", " ")}{" "}
              to {connection?.recordTimeRange?.lastAtBringUp?.slice(0, 16).replace("T", " ")} and later; choose a position or a record time inside it.
            </p>
          )}
        </>
      )}
    </div>
  );
}
