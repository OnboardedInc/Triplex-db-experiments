// [DX-CON1] Derivations tab (DESIGN.md 7.2): evaluate a Triplex derivation for one subject, show each candidate's
// sources, and reconcile against an earlier position (evaluate_derivation). Nothing is materialized.
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CodeEditor } from "@/components/console/code";
import { Mono } from "@/components/console/data-table";
import { ErrorAlert, Slow, TableSkeleton } from "@/components/console/states";
import { useSlow } from "@/hooks/use-tool";
import { callTool, type Answer } from "@/lib/api";
import { toBasis, useBasis } from "@/lib/basis";
import { useConnection } from "@/lib/catalogue";
import { formatDatalog } from "@/lib/datalog-format";
import { n, shortId } from "@/lib/format";
import { beforeLastChange } from "@/lib/session";
import examples from "@/data/derivations.json";
import type { Target } from "./model";

type Source = {
  factId: string;
  entity: string;
  attribute: string;
  transaction: string;
  position: number;
  validFrom: string | null;
  validTo: string | null;
};
type Candidate = {
  id: string;
  identity: Record<string, unknown>;
  result: Record<string, unknown>;
  sources: Source[];
  nextTemporalBoundary: string | number | null;
};
type Reconcile = {
  comparedWithPosition: number;
  added: unknown[];
  removed: unknown[];
  changed: unknown[];
  unchanged: number;
  counts: Record<string, number>;
};
type Evaluation = {
  derivation: {
    id: string;
    name: string;
    identity: string[];
    output: string[];
    pinnedTo: { id: string; label: string } | null;
  };
  subject: { root: string; facts: number; entities: number };
  candidates: Candidate[];
  reconcile?: Reconcile;
  note?: string;
};

const keyOf = (x: unknown): string =>
  typeof x === "string"
    ? x
    : x && typeof x === "object"
      ? (((x as { id?: string }).id ??
          JSON.stringify((x as { identity?: unknown }).identity ?? x)) as string)
      : String(x);
const valueText = (v: unknown) =>
  typeof v === "string" && v.startsWith("acct/")
    ? shortId(v)
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);

export function DerivationsTab({ target }: { target: Target }) {
  const { basis } = useBasis();
  const connection = useConnection().data;
  const [chosen, setChosen] = useState(examples.derivations[0]!.name);
  const ex = examples.derivations.find((d) => d.name === chosen) ?? examples.derivations[0]!;
  const [text, setText] = useState(formatDatalog(ex.query));
  const [identity, setIdentity] = useState(ex.identity.join(", "));
  const [compare, setCompare] = useState(
    String(beforeLastChange() ?? connection?.sealed?.head ?? ""),
  );
  const [answer, setAnswer] = useState<Answer<Evaluation> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [call, setCall] = useState<{ name: string; input: Record<string, unknown> } | null>(null);
  const { slow, elapsed } = useSlow(running);

  const run = async (withCompare: boolean) => {
    let query: unknown;
    try {
      query = JSON.parse(text);
    } catch (e) {
      setError(new Error(`The query is not JSON: ${(e as Error).message}`));
      return;
    }
    const input: Record<string, unknown> = {
      derivation: {
        name: chosen,
        query,
        identity: identity
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      },
      ...(target.isRoot && target.account
        ? { account: target.account, subject: target.subject }
        : { root: target.entity }),
      ...(toBasis(basis) ? { basis: toBasis(basis) } : {}),
      ...(withCompare && /^\d+$/.test(compare) ? { compareToPosition: Number(compare) } : {}),
    };
    setCall({ name: "evaluate_derivation", input });
    setRunning(true);
    setError(null);
    try {
      setAnswer(await callTool<Evaluation>("evaluate_derivation", input));
    } catch (e) {
      setError(e);
      setAnswer(null);
    } finally {
      setRunning(false);
    }
  };

  const r = answer?.reconcile;
  const status = (c: Candidate) => {
    if (!r) return null;
    const k = c.id;
    const id = JSON.stringify(c.identity);
    const has = (list: unknown[]) =>
      list.some(
        (x) =>
          keyOf(x) === k ||
          keyOf(x) === id ||
          JSON.stringify((x as { identity?: unknown })?.identity) === id,
      );
    return has(r.added) ? "added" : has(r.changed) ? "changed" : "unchanged";
  };
  const outputs = answer?.derivation.output ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">Derivation</span>
        <Select
          value={chosen}
          onValueChange={(name) => {
            const d = examples.derivations.find((x) => x.name === name)!;
            setChosen(name);
            setText(formatDatalog(d.query));
            setIdentity(d.identity.join(", "));
            setAnswer(null);
          }}
        >
          <SelectTrigger className="h-8 w-56 font-mono text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {examples.derivations.map((d) => (
              <SelectItem key={d.name} value={d.name} className="font-mono text-xs">
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm">identity</span>
        <Input
          className="h-8 w-40 font-mono text-xs"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
        />
        {answer?.derivation.pinnedTo && (
          <span className="text-muted-foreground text-xs">
            pinned to release <span className="font-mono">{answer.derivation.pinnedTo.label}</span>
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {ex.note} Patterns, comparisons and not only: Triplex's provenance rejects rules, or and
        aggregates.
      </p>
      <CodeEditor value={text} onChange={setText} onRun={() => run(false)} minHeight="6rem" />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => run(false)} disabled={running} data-testid="evaluate">
          Evaluate
        </Button>
        <span className="text-sm">Compare with position</span>
        <Input
          className="h-8 w-32 tabular-nums"
          value={compare}
          onChange={(e) => setCompare(e.target.value.replace(/[^\d]/g, ""))}
        />
        <Button variant="outline" onClick={() => run(true)} disabled={running || !compare}>
          Evaluate and reconcile
        </Button>
      </div>
      <Slow show={slow} elapsed={elapsed}>
        Pulling the subject and evaluating the derivation in the console.
      </Slow>
      {error ? (
        <ErrorAlert error={error} />
      ) : running ? (
        <TableSkeleton rows={3} columns={4} />
      ) : answer ? (
        <>
          <AnswerLine answer={answer} call={call ?? undefined} />
          <p className="text-sm">
            {n(answer.candidates.length)} candidates from {n(answer.subject.facts)} facts in{" "}
            {n(answer.subject.entities)} entities.
            {r &&
              ` Compared with position ${n(r.comparedWithPosition)}: added ${r.counts["added"] ?? r.added.length}, removed ${r.counts["removed"] ?? r.removed.length}, changed ${r.counts["changed"] ?? r.changed.length}, unchanged ${r.counts["unchanged"] ?? r.unchanged}.`}
          </p>
          <div className="overflow-hidden rounded-md border" data-testid="candidates">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Sources</TableHead>
                  {r && <TableHead>Compared with {n(r.comparedWithPosition)}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {answer.candidates.map((c) => (
                  <Fragment key={c.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))}
                    >
                      <TableCell>
                        <Mono>{Object.values(c.identity).map(valueText).join(", ")}</Mono>
                      </TableCell>
                      <TableCell>
                        <Mono>
                          {outputs
                            .filter((o) => !(o in c.identity))
                            .map((o) => `${o.replace(/^\?/, "")} ${valueText(c.result[o])}`)
                            .join(", ")}
                        </Mono>
                      </TableCell>
                      <TableCell>{c.sources.length} facts</TableCell>
                      {r && (
                        <TableCell>
                          <Badge variant="outline">{status(c)}</Badge>
                        </TableCell>
                      )}
                    </TableRow>
                    {open[c.id] && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={4} className="bg-muted/40 whitespace-normal">
                          <div className="space-y-0.5 py-1 text-xs">
                            <div className="text-muted-foreground">
                              Sources of {Object.values(c.identity).map(valueText).join(", ")}
                            </div>
                            {c.sources.map((s) => (
                              <div key={s.factId} className="font-mono">
                                {s.factId} {s.attribute} on {shortId(s.entity)} in transaction{" "}
                                {s.transaction} at position {n(s.position)}
                              </div>
                            ))}
                            <div className="text-muted-foreground">
                              Next valid-time boundary: {c.nextTemporalBoundary ?? "none"}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
                {r?.removed.map((x) => (
                  <TableRow key={keyOf(x)}>
                    <TableCell colSpan={3}>
                      <Mono>
                        {valueText(
                          (x as { identity?: Record<string, unknown> })?.identity
                            ? Object.values(
                                (x as { identity: Record<string, unknown> }).identity,
                              )[0]
                            : x,
                        )}
                      </Mono>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">removed</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {answer.note && <p className="text-muted-foreground text-xs">{answer.note}</p>}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Choose a derivation and Evaluate. Select a candidate for its source facts.
        </p>
      )}
    </div>
  );
}
