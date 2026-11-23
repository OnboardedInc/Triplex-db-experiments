// [DX-CON1] History tab: every stored row of one attribute, retracted ones included, on a valid-time chart and in a
// table with the position that retracted each (field_history). Its cost follows the entity's saves (gap G8).
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnswerLine } from "@/components/console/answer-line";
import { DataTable, Mono } from "@/components/console/data-table";
import { EmptyState, ErrorAlert, Slow, TableSkeleton } from "@/components/console/states";
import { useTool } from "@/hooks/use-tool";
import { useTools } from "@/lib/catalogue";
import { day, n, shortId, time } from "@/lib/format";
import type { Fact, FieldHistory, HistoryRow } from "@/lib/types";
import type { Target } from "./model";

const chartConfig = { live: { label: "live", color: "var(--chart-2)" }, retracted: { label: "retracted", color: "var(--muted-foreground)" } } satisfies ChartConfig;

export function HistoryTab({
  target,
  facts,
  entity,
  attribute,
  onChange,
}: {
  target: Target;
  facts: Fact[];
  entity: string;
  attribute: string | undefined;
  onChange: (entity: string, attribute: string) => void;
}) {
  const tools = useTools();
  const byEntity = tools.accepts("field_history", "entity");
  const ns = target.account ? `acct/${target.account}/` : "";
  const sub = target.subject !== undefined ? `${ns}` : "";
  const kinds: Record<string, "root" | "profile" | "task"> =
    target.subject !== undefined
      ? {
          [`${sub}pl:${String(target.subject).padStart(8, "0")}`]: "root",
          [`${sub}wk:${String(target.subject).padStart(8, "0")}`]: "profile",
          [`${sub}i9:${String(target.subject).padStart(8, "0")}`]: "task",
        }
      : {};
  const entities = [...new Set(facts.map((f) => f.entity))].filter((e) => byEntity || kinds[e]).sort();
  const chosenEntity = entities.includes(entity) ? entity : (entities[0] ?? entity);
  const attributes = [...new Set(facts.filter((f) => f.entity === chosenEntity).map((f) => f.attribute))].sort();
  const chosenAttribute = attribute && attributes.includes(attribute) ? attribute : attributes[0];
  const input = byEntity
    ? { entity: chosenEntity, attribute: chosenAttribute, limit: 40 }
    : { account: target.account, subject: target.subject, kind: kinds[chosenEntity], attribute: chosenAttribute, limit: 40 };
  const history = useTool<FieldHistory>("field_history", input, { enabled: Boolean(chosenAttribute) && (byEntity || Boolean(kinds[chosenEntity])) });
  const rows = history.data?.rows ?? [];
  const now = Date.now();
  const data = [...rows].reverse().map((r, i) => {
    const from = r.validFrom ? Date.parse(r.validFrom) : now;
    const to = r.validTo ? Date.parse(r.validTo) : now;
    return { i: String(i), range: [from, Math.max(to, from + 1)], live: r.live, open: !r.validTo };
  });
  const min = Math.min(...data.map((d) => d.range[0]!), now);
  const columns: ColumnDef<HistoryRow, unknown>[] = [
    { id: "value", header: "Value", accessorFn: (r) => String(r.value), cell: (c) => <Mono className="line-clamp-1">{String(c.row.original.value)}</Mono> },
    { accessorKey: "validFrom", header: "Valid from", cell: (c) => <span className="tabular-nums">{day(c.row.original.validFrom)}</span> },
    { accessorKey: "validTo", header: "Valid to", cell: (c) => <span className="tabular-nums">{c.row.original.validTo ? day(c.row.original.validTo) : "open"}</span> },
    {
      accessorKey: "recordedPosition",
      header: "Recorded at (position)",
      cell: (c) => (
        <span className="tabular-nums">
          {time(c.row.original.recordedAt, false)} ({n(c.row.original.recordedPosition)})
        </span>
      ),
    },
    {
      id: "retired",
      header: "Retracted at (position)",
      accessorFn: (r) => r.retiredPosition ?? Infinity,
      cell: (c) =>
        c.row.original.live ? (
          <Badge variant="secondary">live</Badge>
        ) : (
          <span className="tabular-nums">
            {time(c.row.original.retiredAt, false)} ({n(c.row.original.retiredPosition)})
          </span>
        ),
    },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">Entity</span>
        <Select value={chosenEntity} onValueChange={(e) => onChange(e, attribute ?? "")}>
          <SelectTrigger className="h-8 w-72 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entities.map((e) => (
              <SelectItem key={e} value={e} className="font-mono text-xs">
                {shortId(e, ns)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm">Attribute</span>
        <Select value={chosenAttribute ?? ""} onValueChange={(a) => onChange(chosenEntity, a)}>
          <SelectTrigger className="h-8 w-64 font-mono text-xs">
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
      </div>
      {!byEntity && (
        <p className="text-muted-foreground text-xs">
          History is read for the subject's root, profile and first task until the server's field_history accepts any entity.
        </p>
      )}
      <Slow show={history.slow} elapsed={history.elapsed}>
        Reading this entity's whole history. Recorded for a heavily saved entity on the 1 billion database: 4.4 s on a first read, 225 ms after.
      </Slow>
      {history.isError ? (
        <ErrorAlert error={history.error} onRetry={() => history.refetch()} />
      ) : history.isPending && history.fetchStatus !== "idle" ? (
        <TableSkeleton rows={6} columns={5} />
      ) : !history.data ? (
        <EmptyState title="Choose an entity and an attribute." />
      ) : (
        <>
          <AnswerLine
            answer={history.data}
            call={history.call}
            extra={
              <span className="text-muted-foreground">
                {n(history.data.entityHistoryRows)} rows of this entity's history read
              </span>
            }
          />
          <p className="text-sm">
            {n(history.data.totalRows)} rows of <Mono>{history.data.attribute}</Mono>
            {history.data.savesOfThisField !== undefined ? `, from ${n(history.data.savesOfThisField)} saves` : ""}. Showing {history.data.rowsShown}.
          </p>
          {data.length > 0 && (
            <div className="rounded-md border p-3">
              <div className="text-muted-foreground mb-1 text-xs">Valid time of each stored row, newest at the top</div>
              <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: Math.min(360, 40 + data.length * 18) }}>
                <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }} barCategoryGap={2}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" domain={[min, now]} scale="time" tickFormatter={(v) => day(v).slice(0, 7)} tickLine={false} fontSize={11} />
                  <YAxis type="category" dataKey="i" hide />
                  <ChartTooltip
                    cursor={false}
                    content={({ payload }) => {
                      const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                      if (!p) return null;
                      return (
                        <div className="bg-background rounded-md border px-2 py-1 text-xs shadow-sm">
                          {p.live ? "live" : "retracted"}: {day(p.range[0])} to {p.open ? "open" : day(p.range[1])}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="range" radius={2} isAnimationActive={false}>
                    {data.map((d) => (
                      <Cell key={d.i} fill={d.live ? "var(--color-live)" : "var(--color-retracted)"} fillOpacity={d.live ? 1 : 0.45} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          )}
          <DataTable columns={columns} data={[...rows].reverse()} dense rowKey={(r) => r.id} />
        </>
      )}
    </div>
  );
}
