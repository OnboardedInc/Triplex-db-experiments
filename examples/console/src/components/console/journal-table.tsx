// [DX-CON1] The journal's table: transactions in order with expandable assert and retract rows. Used by the Journal
// screen, the entity's Journal tab and Home.
import { Link } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { changesWords } from "@/pages/home";
import { day, n, shortId, time } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { DataTable, Mono } from "./data-table";

function releaseOf(tx: Transaction, labels?: Map<string, string>) {
  if (tx.release) return tx.release.label ?? tx.release.id.slice(0, 14);
  if (tx.configSnapshot) return labels?.get(tx.configSnapshot) ?? tx.configSnapshot.slice(0, 14) + "...";
  return null;
}

export function JournalTable({ transactions, empty, labels }: { transactions: Transaction[]; empty?: string; labels?: Map<string, string> }) {
  const columns: ColumnDef<Transaction, unknown>[] = [
    { accessorKey: "position", header: "Position", cell: (c) => <span className="tabular-nums">{n(c.row.original.position)}</span> },
    { accessorKey: "recordedAt", header: "Record time", cell: (c) => <span className="tabular-nums whitespace-nowrap">{time(c.row.original.recordedAt)}</span> },
    { accessorKey: "actor", header: "Actor", cell: (c) => c.row.original.actor ?? <span className="text-muted-foreground">loader</span> },
    {
      accessorKey: "commandId",
      header: "Command",
      cell: (c) => <Mono className="line-clamp-1 max-w-52">{c.row.original.commandId ?? ""}</Mono>,
    },
    {
      id: "release",
      header: "Release",
      cell: (c) => {
        const r = releaseOf(c.row.original, labels);
        if (!("configSnapshot" in c.row.original) && !("release" in c.row.original)) return null;
        return r ? (
          <Link to="/configuration" className="font-mono text-xs underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>
            {r}
          </Link>
        ) : (
          <span className="text-muted-foreground text-xs">none</span>
        );
      },
    },
    {
      id: "changes",
      header: "Changes",
      cell: (c) => {
        const w = changesWords(c.row.original);
        return (
          <span className="text-xs">
            {w.counts} {w.on && <>on {/^\d+ entities$/.test(w.on) ? w.on : <Mono>{w.on}</Mono>}</>}
            <span className="text-muted-foreground">{w.hidden}</span>
          </span>
        );
      },
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={transactions}
      dense
      rowKey={(t) => String(t.position)}
      empty={empty ?? "No transactions."}
      renderExpanded={(tx) => (
        <div className="space-y-1 p-3">
          <div className="text-muted-foreground font-mono text-[11px]">{tx.txId}</div>
          <table className="w-full text-xs">
            <tbody>
              {tx.changes.slice(0, 200).map((ch, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="w-16 py-1">
                    <Badge variant={ch.op === "retract" ? "outline" : "secondary"}>{ch.op}</Badge>
                  </td>
                  <td className="py-1 pr-3">
                    <Link className="font-mono hover:underline" to={`/entities/${encodeURIComponent(ch.entity)}`}>
                      {shortId(ch.entity)}
                    </Link>
                  </td>
                  <td className="py-1 pr-3 font-mono">{ch.attribute}</td>
                  <td className="max-w-80 truncate py-1 pr-3 font-mono">{ch.value === null ? "" : String(ch.value)}</td>
                  <td className="text-muted-foreground py-1 tabular-nums whitespace-nowrap">
                    {ch.validFrom || ch.validTo ? `valid ${day(ch.validFrom)} to ${ch.validTo ? day(ch.validTo) : "open"}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tx.changes.length > 200 && <div className="text-muted-foreground text-xs">First 200 of {n(tx.changes.length)} changes shown.</div>}
        </div>
      )}
    />
  );
}
