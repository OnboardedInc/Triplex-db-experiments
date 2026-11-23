// [DX-CON1] Account page (DESIGN.md 8.6): find a loader-built subject by its number.
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnswerLine } from "@/components/console/answer-line";
import { DataTable, Mono } from "@/components/console/data-table";
import { PageTitle } from "@/components/console/layout";
import { ErrorAlert, Refused, TableSkeleton } from "@/components/console/states";
import { useTool } from "@/hooks/use-tool";
import { useConnection } from "@/lib/catalogue";
import { n, time } from "@/lib/format";
import type { FindSubjects, SubjectRow } from "@/lib/types";

const PAGE = 50;

export function AccountPage() {
  const { account = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const connection = useConnection();
  const r = connection.data?.roster.find((x) => x.account === account);
  const first = r?.firstPerson ?? 0;
  const last = r ? r.firstPerson + r.people - 1 : 0;
  const from = Math.max(first, Number(params.get("from") ?? first) || first);
  const [go, setGo] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const count = r ? Math.min(PAGE, last - from + 1) : PAGE;
  const subjects = useTool<FindSubjects>("find_subjects", { account, from, count }, { enabled: Boolean(r) && count > 0, keepPrevious: true });

  const columns: ColumnDef<SubjectRow, unknown>[] = [
    {
      accessorKey: "subject",
      header: "Subject",
      cell: (c) => (
        <Link className="tabular-nums underline-offset-4 hover:underline" to={`/accounts/${account}/subjects/${c.row.original.subject}`}>
          {c.row.original.subject}
        </Link>
      ),
    },
    {
      accessorKey: "subjectId",
      header: "Root entity",
      cell: (c) => (
        <Link to={`/accounts/${account}/subjects/${c.row.original.subject}`}>
          <Mono>{c.row.original.subjectId}</Mono>
        </Link>
      ),
    },
    { accessorKey: "status", header: "Status", cell: (c) => (c.row.original.status ? <Badge variant="outline">{c.row.original.status}</Badge> : null) },
    { accessorKey: "placements", header: "Placements", cell: (c) => <span className="tabular-nums">{c.row.original.placements}</span> },
    { accessorKey: "lastRecordedAt", header: "Last recorded", cell: (c) => <span className="tabular-nums">{time(c.row.original.lastRecordedAt, false)}</span> },
  ];

  const open = () => {
    if (!/^\d+$/.test(go)) return setRefusal("Give a subject number.");
    const num = Number(go);
    if (!r || num < first || num > last) return setRefusal(`${account} has subjects ${first} to ${last}. ${num} is outside the account's range.`);
    setRefusal(null);
    navigate(`/accounts/${account}/subjects/${num}`);
  };

  if (connection.data && !r) return <Refused reason={`There is no account named ${account}. Choose one of ${connection.data.roster.map((x) => x.account).join(", ")}.`} />;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageTitle
        title={account}
        actions={r && <span className="text-muted-foreground text-sm tabular-nums">{n(r.people)} subjects, numbers {first} to {n(last)}</span>}
      />
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          open();
        }}
      >
        <span className="text-sm">Go to subject</span>
        <Input className="w-32 tabular-nums" inputMode="numeric" value={go} onChange={(e) => setGo(e.target.value.trim())} placeholder={String(first)} data-testid="go-subject" />
        <Button type="submit" size="sm">
          Open
        </Button>
      </form>
      {refusal && <Refused reason={refusal} />}
      {subjects.isError ? (
        <ErrorAlert error={subjects.error} onRetry={() => subjects.refetch()} />
      ) : (
        <>
          <AnswerLine answer={subjects.data} call={subjects.call} recorded="Recorded latest" valid="Valid now" />
          {subjects.isPending ? (
            <TableSkeleton rows={8} columns={5} />
          ) : (
            <DataTable columns={columns} data={subjects.data?.subjects ?? []} rowKey={(s) => String(s.subject)} dense />
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground tabular-nums">
              {n(from)} to {n(from + count - 1)} of {n(r?.people ?? 0)}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={from <= first} onClick={() => setParams({ from: String(Math.max(first, from - PAGE)) })}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={from + PAGE > last} onClick={() => setParams({ from: String(from + PAGE) })}>
                Next
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Subjects are found by account and number. A protected value is never looked up by its value. This list always reads at the latest position.
          </p>
        </>
      )}
    </div>
  );
}
