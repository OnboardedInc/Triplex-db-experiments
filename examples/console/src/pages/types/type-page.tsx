// [DX-CON1] Type page (DESIGN.md 8.4): the entities of one type by number (Entities) and what the type is (Definition).
import { Link, useParams, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  TableSkeleton,
} from "@/components/console/states";
import { useTool } from "@/hooks/use-tool";
import { ToolError } from "@/lib/api";
import { recordedWords, toBasis, useBasis, validWords } from "@/lib/basis";
import { useConnection, useDefaults, useTools } from "@/lib/catalogue";
import { useTypes, valueTypeWords } from "@/lib/config";
import { n, shortId, time } from "@/lib/format";
import type { AttributeDef, DescribeType, ListEntities } from "@/lib/types";

const PAGE = 50;

function Entities({ name, attrs }: { name: string; attrs: AttributeDef[] }) {
  const [params, setParams] = useSearchParams();
  const tools = useTools();
  const types = useTypes();
  const { basis } = useBasis();
  const connection = useConnection().data;
  const sheets = useSheets();
  const summary = types.data?.types.find((t) => t.name === name);
  const byAccount = summary?.createdByAccount ?? {};
  const best = Object.entries(byAccount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const defaults = useDefaults();
  const account = params.get("account") ?? best ?? defaults.account ?? "";
  const from = Number(params.get("from") ?? 0) || 0;
  const q = useTool<ListEntities>(
    "list_entities",
    { type: name, account, from, count: PAGE, basis: toBasis(basis) },
    { enabled: tools.has("list_entities"), keepPrevious: true },
  );
  if (!tools.has("list_entities"))
    return <NotInCatalogue tool="list_entities" what="Listing this type's entities" />;
  const created = q.data?.created ?? byAccount[account] ?? 0;
  const columns: ColumnDef<ListEntities["entities"][number], unknown>[] = [
    {
      accessorKey: "number",
      header: "#",
      cell: (c) => <span className="tabular-nums">{c.row.original.number}</span>,
    },
    {
      accessorKey: "entity",
      header: "Entity ID",
      cell: (c) => (
        <Link
          to={`/entities/${encodeURIComponent(c.row.original.entity)}`}
          className="hover:underline"
        >
          <Mono>{c.row.original.entity}</Mono>
        </Link>
      ),
    },
    ...attrs.map(
      (a): ColumnDef<ListEntities["entities"][number], unknown> => ({
        id: a.key,
        header: a.key,
        accessorFn: (r) => r.attributes[a.key],
        cell: (c) => {
          const v = c.row.original.attributes[a.key];
          if (v === undefined || v === null) return null;
          const list = Array.isArray(v) ? v : [v];
          return (
            <span className="space-x-1">
              {list.map((x, i) =>
                a.valueType === "ref" ? (
                  <Link
                    key={i}
                    to={`/entities/${encodeURIComponent(String(x))}`}
                    className="font-mono text-xs hover:underline"
                  >
                    {shortId(String(x))}
                  </Link>
                ) : (
                  <Mono key={i}>{String(x)}</Mono>
                ),
              )}
            </span>
          );
        },
      }),
    ),
    {
      id: "recordedAt",
      header: "Recorded at",
      accessorFn: (r) => r.recordedAt,
      cell: (c) => <span className="tabular-nums">{time(c.row.original.recordedAt, false)}</span>,
    },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">Account</span>
        <Select
          value={account}
          onValueChange={(a) => setParams((p) => (p.set("account", a), p.delete("from"), p))}
        >
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {connection?.roster.map((r) => (
              <SelectItem key={r.account} value={r.account}>
                {r.account}
                {byAccount[r.account] ? ` (${byAccount[r.account]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm">
          {n(created)} created in {account}.
        </span>
      </div>
      {q.isError ? (
        <ErrorAlert error={q.error} onRetry={() => q.refetch()} />
      ) : q.isPending ? (
        <TableSkeleton rows={5} columns={attrs.length + 2} />
      ) : (
        <>
          <AnswerLine
            answer={q.data}
            call={q.call}
            recorded={recordedWords(basis)}
            valid={validWords(basis)}
          />
          {q.data && q.data.entities.length === 0 && from === 0 ? (
            <EmptyState title={`No ${name} in ${account} yet.`}>
              <Button onClick={() => sheets.openEntityForm({ type: name, account })}>
                New {name}
              </Button>
            </EmptyState>
          ) : (
            <DataTable
              columns={columns}
              data={q.data?.entities ?? []}
              dense
              columnsMenu
              rowKey={(r) => r.entity}
            />
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground tabular-nums">
              {created
                ? `${n(from)} to ${n(Math.min(created, from + PAGE) - 1)} of ${n(created)}`
                : ""}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={from === 0}
                onClick={() =>
                  setParams((p) => (p.set("from", String(Math.max(0, from - PAGE))), p))
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={from + PAGE >= created}
                onClick={() => setParams((p) => (p.set("from", String(from + PAGE)), p))}
              >
                Next
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Listed by entity number. This engine has no index by entity type. See{" "}
            <Link to="/about?tab=limits" className="underline underline-offset-4">
              About this database, gap G2
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

function Definition({ d }: { d: DescribeType }) {
  const attrColumns: ColumnDef<AttributeDef, unknown>[] = [
    { accessorKey: "key", header: "Attribute", cell: (c) => <Mono>{c.row.original.key}</Mono> },
    {
      accessorKey: "valueType",
      header: "Value type",
      cell: (c) =>
        c.row.original.valueType === "enumOf"
          ? `enum: ${c.row.original.enumValues?.join(", ")}`
          : (valueTypeWords[c.row.original.valueType] ?? c.row.original.valueType),
    },
    {
      accessorKey: "required",
      header: "Required",
      cell: (c) => (c.row.original.required ? "yes" : "no"),
    },
    {
      accessorKey: "cardinality",
      header: "Cardinality",
      cell: (c) => c.row.original.cardinality ?? "one",
    },
    {
      accessorKey: "unique",
      header: "Unique",
      cell: (c) =>
        c.row.original.unique ? <Badge variant="outline">yes, not enforced</Badge> : "no",
    },
    {
      accessorKey: "refTarget",
      header: "Reference target",
      cell: (c) => c.row.original.refTarget ?? "",
    },
  ];
  const t = d.type;
  return (
    <div className="space-y-6">
      <DataTable columns={attrColumns} data={t.attributes} dense rowKey={(a) => a.key} />
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Constraints generated by Triplex</h3>
        <DataTable
          dense
          rowKey={(c) => c.id}
          data={t.constraints}
          columns={[
            {
              accessorKey: "id",
              header: "Constraint",
              cell: (c) => <Mono>{c.row.original.id}</Mono>,
            },
            { accessorKey: "kind", header: "Kind" },
            {
              accessorKey: "status",
              header: "Status",
              cell: (c) => (
                <Badge variant={/^Checked/.test(c.row.original.status) ? "secondary" : "outline"}>
                  {c.row.original.status}
                </Badge>
              ),
            },
          ]}
        />
        {d.uniqueness && <p className="text-muted-foreground text-xs">{d.uniqueness}</p>}
        {d.note && <p className="text-muted-foreground text-xs">{d.note}</p>}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Revisions</h3>
        <DataTable
          dense
          rowKey={(r) => r.revision}
          data={t.revisions}
          columns={[
            {
              accessorKey: "sequence",
              header: "Sequence",
              cell: (c) => <span className="tabular-nums">{c.row.original.sequence}</span>,
            },
            {
              accessorKey: "revision",
              header: "Revision",
              cell: (c) => <Mono>{c.row.original.revision.slice(0, 18)}...</Mono>,
            },
            { accessorKey: "release", header: "Release" },
            {
              accessorKey: "change",
              header: "Change",
              cell: (c) => <Badge variant="outline">{c.row.original.change}</Badge>,
            },
          ]}
        />
      </div>
    </div>
  );
}

export function TypePage() {
  const { name = "" } = useParams();
  const defaults = useDefaults();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "entities";
  const tools = useTools();
  const sheets = useSheets();
  const d = useTool<DescribeType>(
    "describe_entity_type",
    { name },
    { enabled: tools.has("describe_entity_type") },
  );
  const types = useTypes();
  const summary = types.data?.types.find((t) => t.name === name);
  if (tools.isSuccess && !tools.has("describe_entity_type"))
    return <NotInCatalogue tool="describe_entity_type" what="Entity types" />;
  const notFound = d.error instanceof ToolError && /Unknown|NotFound/.test(d.error.code);
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageTitle
        title={name}
        actions={
          name !== "Subject" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  sheets.openNewType({ name, attributes: d.data?.type.attributes, edit: true })
                }
                disabled={!d.data}
              >
                Edit type
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  sheets.openEntityForm({ type: name, account: params.get("account") ?? undefined })
                }
                data-testid="new-entity"
              >
                + New {name}
              </Button>
            </>
          )
        }
      >
        Entity type in release {d.data?.release?.label ?? types.data?.release?.label ?? "..."} (
        {d.data?.ref ?? "live"}).
        {summary?.created !== undefined &&
          summary?.created !== null &&
          ` ${n(summary.created)} created.`}
        {summary?.note && <span className="mt-1 block">{summary.note}</span>}
      </PageTitle>
      {notFound ? (
        <Refused
          reason={`${name} is not a type in the release live points to. ${(d.error as Error).message}`}
        />
      ) : (
        <Tabs value={tab} onValueChange={(t) => setParams({ tab: t })}>
          <TabsList>
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="definition">Definition</TabsTrigger>
          </TabsList>
          <TabsContent value="entities" className="mt-4">
            {name === "Subject" ? (
              <EmptyState
                title="Subjects are listed by account"
                description="Loader-built subjects carry no entity type, so the console finds them by account and number, not by type."
              >
                <Button asChild variant="outline">
                  <Link to={`/accounts/${defaults.account ?? ""}`}>
                    Open {defaults.account ?? "an account"}
                  </Link>
                </Button>
              </EmptyState>
            ) : d.data ? (
              <Entities name={name} attrs={d.data.type.attributes} />
            ) : d.isError ? (
              <ErrorAlert error={d.error} onRetry={() => d.refetch()} />
            ) : (
              <TableSkeleton />
            )}
          </TabsContent>
          <TabsContent value="definition" className="mt-4 space-y-3">
            {d.isError ? (
              <ErrorAlert error={d.error} onRetry={() => d.refetch()} />
            ) : d.isPending ? (
              <TableSkeleton />
            ) : (
              <>
                <AnswerLine answer={d.data} call={d.call} />
                <Definition d={d.data!} />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export function TypesPage() {
  const types = useTypes();
  const tools = useTools();
  const sheets = useSheets();
  if (tools.isSuccess && !tools.has("list_entity_types"))
    return <NotInCatalogue tool="list_entity_types" what="Entity types" />;
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageTitle
        title="Entity types"
        actions={<Button onClick={() => sheets.openNewType()}>New entity type</Button>}
      >
        The types in the release live points to
        {types.data?.release ? `: ${types.data.release.label}` : ""}.
      </PageTitle>
      {types.isError ? (
        <ErrorAlert error={types.error} onRetry={() => types.refetch()} />
      ) : types.isPending ? (
        <TableSkeleton />
      ) : !types.data?.types.length ? (
        <EmptyState title="No release yet. Define the first entity type.">
          <Button onClick={() => sheets.openNewType()}>New entity type</Button>
        </EmptyState>
      ) : (
        <>
          <AnswerLine answer={types.data} call={types.call} />
          <DataTable
            rowKey={(t) => t.name}
            data={types.data.types}
            columns={[
              {
                accessorKey: "name",
                header: "Type",
                cell: (c) => (
                  <Link
                    className="font-medium hover:underline"
                    to={`/types/${encodeURIComponent(c.row.original.name)}`}
                  >
                    {c.row.original.name}
                  </Link>
                ),
              },
              {
                accessorKey: "attributes",
                header: "Attributes",
                cell: (c) => <span className="tabular-nums">{c.row.original.attributes}</span>,
              },
              {
                accessorKey: "created",
                header: "Entities created",
                cell: (c) =>
                  c.row.original.created === null || c.row.original.created === undefined ? (
                    <span className="text-muted-foreground">not created by the console</span>
                  ) : (
                    n(c.row.original.created)
                  ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
