// [DX-CON1] Both time axes tab (DESIGN.md 8.7): three views of one date side by side. With read_entity: three reads of
// the entity, each with its own basis, position and store time. Without it: read_subject_at for a loader-built subject.
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AnswerLine } from "@/components/console/answer-line";
import { AskAssistant } from "@/components/console/ask-assistant";
import { Mono } from "@/components/console/data-table";
import { EmptyState, ErrorAlert, NotInCatalogue, TableSkeleton } from "@/components/console/states";
import { useTool } from "@/hooks/use-tool";
import { callTool, type Answer } from "@/lib/api";
import { useConnection, useTools } from "@/lib/catalogue";
import { day, ms, n, shortId } from "@/lib/format";
import { beforeLastChange } from "@/lib/session";
import type { AtView, Fact, ReadAt, ReadEntity } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Target } from "./model";

function Controls({
  attributes,
  attribute,
  date,
  believed,
  onChange,
}: {
  attributes: string[];
  attribute: string | undefined;
  date: string;
  believed: string;
  onChange: (p: Record<string, string | undefined>) => void;
}) {
  const [dateDraft, setDateDraft] = useState(date);
  const [believedDraft, setBelievedDraft] = useState(believed);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm">Attribute</span>
      <Select value={attribute ?? ""} onValueChange={(a) => onChange({ attribute: a })}>
        <SelectTrigger className="h-8 w-64 font-mono text-xs" data-testid="time-attribute">
          <SelectValue placeholder="Choose an attribute" />
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
        data-testid="time-date"
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
        data-testid="time-believed"
        onChange={(e) => setBelievedDraft(e.target.value)}
        onBlur={() => onChange({ believed: believedDraft || undefined })}
        onKeyDown={(e) => e.key === "Enter" && onChange({ believed: believedDraft || undefined })}
      />
      <span className="text-muted-foreground text-xs">
        a position, or a record time inside the database's range
      </span>
    </div>
  );
}

const valuesOf = (
  facts: { attribute: string; value: unknown }[] | undefined,
  attribute?: string,
) => {
  const list = (facts ?? []).filter((f) => f.attribute === attribute).map((f) => String(f.value));
  return list.length ? list.join(", ") : "no value";
};

export function TimeTab(props: {
  target: Target;
  facts: Fact[];
  entity: string;
  attribute?: string;
  at?: string;
  believed?: string;
  onChange: (p: Record<string, string | undefined>) => void;
}) {
  const tools = useTools();
  if (tools.has("read_entity")) return <ByEntity {...props} />;
  if (props.target.subject === undefined)
    return <NotInCatalogue tool="read_entity" what="Both time axes for this entity" />;
  return <BySubject {...props} />;
}

function useDefaults(
  facts: Fact[],
  entity: string,
  attribute?: string,
  at?: string,
  believed?: string,
) {
  const connection = useConnection().data;
  const attributes = [
    ...new Set(facts.filter((f) => f.entity === entity).map((f) => f.attribute)),
  ].sort();
  const chosen = attribute && attributes.includes(attribute) ? attribute : attributes[0];
  const fallback = beforeLastChange() ?? connection?.sealed?.head;
  const believedText = believed ?? (fallback !== undefined ? String(fallback) : "");
  const date = at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const position = /^\d+$/.test(believedText) ? Number(believedText) : undefined;
  const recordedAt =
    position === undefined && believedText && !Number.isNaN(Date.parse(believedText))
      ? new Date(believedText).toISOString()
      : undefined;
  return {
    connection,
    attributes,
    chosen,
    believedText,
    date,
    position,
    recordedAt,
    validAt: new Date(date + "T12:00:00Z").toISOString(),
  };
}

function ByEntity({
  facts,
  entity,
  attribute,
  at,
  believed,
  onChange,
}: Parameters<typeof TimeTab>[0]) {
  const d = useDefaults(facts, entity, attribute, at, believed);
  const believedBasis = {
    validAt: d.validAt,
    ...(d.position !== undefined
      ? { position: d.position }
      : d.recordedAt
        ? { recordedAt: d.recordedAt }
        : {}),
  };
  const calls = [
    { name: "read_entity", input: { entity } },
    { name: "read_entity", input: { entity, basis: { validAt: d.validAt } } },
    { name: "read_entity", input: { entity, basis: believedBasis } },
  ];
  const results = useQueries({
    queries: calls.map((c) => ({
      queryKey: ["tool", c.name, c.input],
      queryFn: () => callTool<ReadEntity>(c.name, c.input),
      retry: false,
    })),
  }) as {
    data?: Answer<ReadEntity>;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
  }[];
  const dayWords = new Date(d.date + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const failed = results.find((r) => r.isError);
  const all = results.every((r) => r.data);
  const attrs = [
    ...new Set(results.flatMap((r) => r.data?.facts.map((f) => f.attribute) ?? [])),
  ].sort();
  const differs = attrs.filter(
    (a) => new Set(results.map((r) => valuesOf(r.data?.facts, a))).size > 1,
  );
  const headers = [
    "Now",
    `True on ${dayWords}, as known now`,
    `Believed at ${d.position !== undefined ? `position ${n(d.position)}` : d.recordedAt?.slice(0, 16).replace("T", " ")} about ${dayWords}`,
  ];
  return (
    <div className="space-y-3">
      <Controls
        attributes={d.attributes}
        attribute={d.chosen}
        date={d.date}
        believed={d.believedText}
        onChange={onChange}
      />
      {failed ? (
        <ErrorAlert error={failed.error} onRetry={() => results.forEach((r) => r.refetch())} />
      ) : !all ? (
        <TableSkeleton rows={4} columns={4} />
      ) : (
        <>
          <div className="overflow-hidden rounded-md border" data-testid="time-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48" />
                  {headers.map((h) => (
                    <TableHead key={h} className="whitespace-normal">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell>
                    <Mono>{d.chosen}</Mono>
                  </TableCell>
                  {results.map((r, i) => (
                    <TableCell
                      key={i}
                      className={cn(
                        "w-1/4 text-base whitespace-normal break-all",
                        i === 2 &&
                          valuesOf(r.data?.facts, d.chosen) !==
                            valuesOf(results[1]!.data?.facts, d.chosen) &&
                          "font-semibold",
                      )}
                    >
                      <Mono className="text-sm">{valuesOf(r.data?.facts, d.chosen)}</Mono>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">Position</TableCell>
                  {results.map((r, i) => (
                    <TableCell key={i} className="tabular-nums">
                      {n(r.data!.position)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">Store</TableCell>
                  {results.map((r, i) => (
                    <TableCell key={i} className="tabular-nums">
                      {ms(r.data!.timing.serverMs)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">Round trip</TableCell>
                  {results.map((r, i) => (
                    <TableCell key={i} className="tabular-nums">
                      {ms(r.data!.timing.roundTripMs)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">Ask</TableCell>
                  {calls.map((c, i) => (
                    <TableCell key={i}>
                      <AskAssistant call={c} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-sm" data-testid="time-summary">
            {n(differs.length)} of {n(attrs.length)}{" "}
            {attrs.length === 1 ? "attribute differs" : "attributes differ"} between the three views
            {differs.length ? `: ${differs.join(", ")}` : ""}.
          </p>
          {results[2]!.data!.facts.length === 0 && (
            <p className="text-muted-foreground text-xs">
              Nothing was recorded about this entity at that position or record time. Record time on
              this database runs from{" "}
              {d.connection?.recordTimeRange?.first?.slice(0, 16).replace("T", " ")} and runs about
              a year ahead of wall time.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function BySubject({
  target,
  facts,
  entity,
  attribute,
  at,
  believed,
  onChange,
}: Parameters<typeof TimeTab>[0]) {
  const tools = useTools();
  const d = useDefaults(facts, entity, attribute, at, believed);
  const ns = target.account ? `acct/${target.account}/` : "";
  const input = {
    account: target.account,
    subject: target.subject,
    at: d.validAt,
    attribute: d.chosen,
    position: tools.accepts("read_subject_at", "position") ? d.position : undefined,
    recordedAt: d.recordedAt,
  };
  const q = useTool<ReadAt>("read_subject_at", input, { enabled: Boolean(d.chosen) });
  const pick = (list: AtView[] | undefined) =>
    (list ?? []).filter((f) => f.entity === shortId(entity, ns) || f.entity === entity);
  const v = q.data
    ? [pick(q.data.current), pick(q.data.trueThenAsKnownNow), pick(q.data.believedThen)]
    : undefined;
  const dayWords = new Date(d.date + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return (
    <div className="space-y-3">
      <Controls
        attributes={d.attributes}
        attribute={d.chosen}
        date={d.date}
        believed={d.believedText}
        onChange={onChange}
      />
      {q.isError ? (
        <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <TableSkeleton rows={3} columns={4} />
      ) : !v ? (
        <EmptyState title="Choose an attribute." />
      ) : (
        <>
          <AnswerLine answer={q.data} call={q.call} />
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48" />
                  <TableHead>Now</TableHead>
                  <TableHead>True on {dayWords}, as known now</TableHead>
                  <TableHead>
                    Believed at{" "}
                    {d.position !== undefined
                      ? `position ${n(d.position)}`
                      : day(q.data?.believedAsRecordedAt)}{" "}
                    about {dayWords}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell>
                    <Mono>{d.chosen}</Mono>
                  </TableCell>
                  {v.map((x, i) => (
                    <TableCell key={i} className="w-1/4 whitespace-normal break-all">
                      <Mono className="text-sm">{valuesOf(x, d.chosen)}</Mono>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-sm">
            Across the subject's <Mono>{d.chosen}</Mono> facts, {n(q.data!.differences.length)}{" "}
            differ between the three views. The three reads ran in one tool call; its store time is
            their sum.
          </p>
        </>
      )}
    </div>
  );
}
