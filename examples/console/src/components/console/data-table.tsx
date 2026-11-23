// [DX-CON1] shadcn's data table recipe on TanStack Table: sorting, column visibility, optional client paging and
// expandable rows. Every table in the console uses it.
import { Fragment, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function DataTable<T>({
  columns,
  data,
  pageSize,
  empty = "No rows.",
  toolbar,
  columnsMenu = false,
  renderExpanded,
  rowKey,
  onRowClick,
  selected,
  className,
  dense,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  pageSize?: number;
  empty?: ReactNode;
  toolbar?: ReactNode;
  columnsMenu?: boolean;
  renderExpanded?: (row: T) => ReactNode;
  rowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  selected?: (row: T) => boolean;
  className?: string;
  dense?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(pageSize
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: { pagination: { pageSize, pageIndex: 0 } },
        }
      : {}),
    getRowId: rowKey ? (r, i) => rowKey(r, i) : undefined,
  });
  const rows = table.getRowModel().rows;
  const toggle = (row: Row<T>) => setOpen((o) => ({ ...o, [row.id]: !o[row.id] }));
  return (
    <div className={cn("space-y-2", className)}>
      {(toolbar || columnsMenu) && (
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {columnsMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  Columns <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllLeafColumns()
                  .filter((c) => c.getCanHide())
                  .map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={c.getIsVisible()}
                      onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    >
                      {typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((g) => (
              <TableRow key={g.id}>
                {g.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <TableHead key={h.id} className={cn("whitespace-nowrap", dense && "h-8")}>
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button
                          className="inline-flex items-center gap-1 hover:underline"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUpIcon className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon className="size-3" />
                          ) : null}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={selected?.(row.original) ? "selected" : undefined}
                    className={cn((onRowClick || renderExpanded) && "cursor-pointer")}
                    onClick={() => {
                      if (renderExpanded) toggle(row);
                      onRowClick?.(row.original);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn("align-top whitespace-normal", dense && "py-1.5")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderExpanded && open[row.id] && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={row.getVisibleCells().length} className="bg-muted/40 p-0">
                        {renderExpanded(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-20 text-center"
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pageSize && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground tabular-nums">
            {table.getState().pagination.pageIndex * pageSize + 1} to{" "}
            {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, data.length)} of{" "}
            {data.length.toLocaleString("en-US")}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Monospace cell for IDs, attributes and values. */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-xs break-all", className)}>{children}</span>;
}
