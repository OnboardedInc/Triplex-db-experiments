// [DX-CON1] Facts tab: the entity tree beside the fact table (entity, attribute, value; references are links).
import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataTable, Mono } from "@/components/console/data-table";
import { day, kindOf, n, shortId, time } from "@/lib/format";
import type { Fact } from "@/lib/types";
import { buildTree, type Node } from "./model";
import { cn } from "@/lib/utils";

function TreeNode({ node, selected, onSelect, ns }: { node: Node; selected: string; onSelect: (id: string) => void; ns: string }) {
  const [open, setOpen] = useState(node.depth < 3);
  return (
    <div>
      <div
        className={cn(
          "hover:bg-muted flex cursor-pointer items-center gap-1 rounded-sm py-0.5 pr-2 text-xs",
          selected === node.id && "bg-muted font-medium",
        )}
        style={{ paddingLeft: node.depth * 12 + 4 }}
        onClick={() => onSelect(node.id)}
      >
        {node.children.length ? (
          <button
            className="text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <span className="truncate font-mono">{shortId(node.id, ns)}</span>
        <span className="text-muted-foreground ml-auto pl-2">{node.depth === 0 && node.kind === "root" ? "root" : node.kind}</span>
        <span className="text-muted-foreground w-6 text-right tabular-nums">{node.facts}</span>
      </div>
      {open && node.children.map((c) => <TreeNode key={c.id} node={c} selected={selected} onSelect={onSelect} ns={ns} />)}
    </div>
  );
}

export function valueCell(f: Pick<Fact, "value" | "type">, ns?: string) {
  if (f.type === "ref" && typeof f.value === "string")
    return (
      <Link to={`/entities/${encodeURIComponent(f.value)}`} className="font-mono text-xs underline-offset-4 hover:underline">
        {"-> "}
        {shortId(f.value, ns)}
      </Link>
    );
  const text = f.value === null || f.value === undefined ? "" : typeof f.value === "object" ? JSON.stringify(f.value) : String(f.value);
  return <Mono className={cn(text.length > 40 && "line-clamp-2")}>{f.type === "datetime" && /^\d+$/.test(text) ? time(Number(text)) : text}</Mono>;
}

export function FactsTab({
  facts,
  root,
  ns,
  selected,
  onSelect,
  entityType,
  onEdit,
  onHistory,
  canEdit,
}: {
  facts: Fact[];
  root: string;
  ns: string;
  selected: string;
  onSelect: (id: string) => void;
  entityType?: string;
  onEdit: (entity: string, attribute: string) => void;
  onHistory: (entity: string, attribute: string) => void;
  canEdit: (entity: string) => boolean;
}) {
  const [filter, setFilter] = useState("");
  const tree = useMemo(() => buildTree(facts, root), [facts, root]);
  const own = facts.filter((f) => f.entity === selected);
  const shown = own.filter(
    (f) => !filter || f.attribute.toLowerCase().includes(filter.toLowerCase()) || String(f.value).toLowerCase().includes(filter.toLowerCase()),
  );
  const hasPosition = own.some((f) => f.recordedPosition !== undefined);
  const columns: ColumnDef<Fact, unknown>[] = [
    { accessorKey: "attribute", header: "Attribute", cell: (c) => <Mono>{c.row.original.attribute}</Mono> },
    { id: "value", header: "Value", accessorFn: (f) => String(f.value), cell: (c) => valueCell(c.row.original, ns) },
    { accessorKey: "validFrom", header: "Valid from", cell: (c) => <span className="tabular-nums">{day(c.row.original.validFrom)}</span> },
    { accessorKey: "validTo", header: "Valid to", cell: (c) => <span className="tabular-nums">{c.row.original.validTo ? day(c.row.original.validTo) : "open"}</span> },
    { accessorKey: "recordedAt", header: "Recorded at", cell: (c) => <span className="tabular-nums">{time(c.row.original.recordedAt, false)}</span> },
    ...(hasPosition
      ? [{ accessorKey: "recordedPosition", header: "Position", cell: (c) => <span className="tabular-nums">{n(c.row.original.recordedPosition)}</span> } as ColumnDef<Fact, unknown>]
      : []),
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: (c) =>
        canEdit(c.row.original.entity) && c.row.original.type !== "ref" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(c.row.original.entity, c.row.original.attribute);
            }}
          >
            Edit
          </Button>
        ) : null,
    },
  ];
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-[32rem] rounded-md border">
      <ResizablePanel defaultSize="30%" minSize="18%">
        <div className="flex h-full flex-col">
          <div className="text-muted-foreground border-b px-3 py-2 text-xs font-medium">
            Entity tree <span className="tabular-nums">({n(new Set(facts.map((f) => f.entity)).size)} with facts at this basis)</span>
          </div>
          <ScrollArea className="h-[30rem] p-1">
            {tree.map((t) => (
              <TreeNode key={t.id} node={t} selected={selected} onSelect={onSelect} ns={ns} />
            ))}
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="70%" minSize="40%">
        <div className="space-y-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Mono className="text-sm">{selected}</Mono>
            <span className="text-muted-foreground text-xs">kind: {kindOf(selected)}{entityType && entityType !== "untyped" ? "" : ", read from the ID"}</span>
            <Badge variant="outline" className="ml-auto">
              {entityType && entityType !== "untyped" && selected === root ? entityType : "Untyped"}
            </Badge>
          </div>
          <DataTable
            columns={columns}
            data={shown}
            dense
            rowKey={(f) => f.id}
            onRowClick={(f) => onHistory(f.entity, f.attribute)}
            empty="This entity has no facts at this basis."
            toolbar={<Input className="h-8 w-64" placeholder="Filter attribute or value" value={filter} onChange={(e) => setFilter(e.target.value)} />}
          />
          <p className="text-muted-foreground text-xs">Each row opens that attribute's history. Record times are the store's clock, in UTC.</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
