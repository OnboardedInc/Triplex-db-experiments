// [DX-CON1] Query (DESIGN.md 4, 8.9): Triplex Datalog as Triplex documents it, against one subject, up to 16 subjects at
// one position, or the store. Refusals are shown with their reason; the basis control applies; Pin this position.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnswerLine } from "@/components/console/answer-line";
import { AskAssistant } from "@/components/console/ask-assistant";
import { CodeEditor, JsonView } from "@/components/console/code";
import { SAVED_KEY, type SavedQuestion } from "@/components/console/command-palette";
import { DataTable, Mono } from "@/components/console/data-table";
import { ErrorAlert, NotInCatalogue, Refused, Slow } from "@/components/console/states";
import { useSlow } from "@/hooks/use-tool";
import { callTool, ToolError, type Answer } from "@/lib/api";
import { recordedWords, toBasis, useBasis, validWords } from "@/lib/basis";
import { useConnection, useDefaults, useTools } from "@/lib/catalogue";
import { n, plural, shortId } from "@/lib/format";
import { loadLocal, saveLocal } from "@/lib/session";
import { adaptExample, examples, type Example } from "@/lib/examples";
import { cn } from "@/lib/utils";
import { formatDatalog } from "@/lib/datalog-format";

type SourceKind = "subject" | "subjects" | "store";
type QueryAnswer = {
  columns?: (string | { name: string; note?: string })[];
  summary?: string;
  answeredBy?: string;
  total?: number;
  page?: { offset: number; size: number };
  storeMs?: number;
  bindings?: (Record<string, unknown> | unknown[])[];
  route?: string;
  source?: string;
  pulled?: { facts?: number; entities?: number; subjects?: number };
  plan?: unknown;
  cursor?: string | null;
  nextCursor?: string | null;
  exactIntegers?: string[];
  note?: string;
  refused?: { reason: string };
};

function parseSubjects(text: string) {
  const out: number[] = [];
  for (const part of text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)) {
    const m = /^(\d+)\s*(?:-|to)\s*(\d+)$/.exec(part);
    if (m) for (let i = Number(m[1]); i <= Number(m[2]) && out.length < 17; i++) out.push(i);
    else if (/^\d+$/.test(part)) out.push(Number(part));
  }
  return [...new Set(out)];
}

const chartConfig = { value: { label: "value", color: "var(--primary)" } } satisfies ChartConfig;

export function QueryPage() {
  const tools = useTools();
  const connection = useConnection().data;
  const { basis, setBasis } = useBasis();
  const [params, setParams] = useSearchParams();
  const [source, setSource] = useState<SourceKind>("subject");
  const defaults = useDefaults();
  const [account, setAccount] = useState("");
  const [subject, setSubject] = useState("");
  const [entity, setEntity] = useState("");
  const [subjectsText, setSubjectsText] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState<string>("");
  const [selected, setSelected] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedQuestion[]>(() =>
    loadLocal<SavedQuestion[]>(SAVED_KEY, []),
  );
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState<Answer<QueryAnswer> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [lastCall, setLastCall] = useState<{ name: string; input: Record<string, unknown> } | null>(
    null,
  );
  const [tab, setTab] = useState("table");
  const { slow, elapsed } = useSlow(running, 1000);
  const run1 = useSlow(running, 0);

  const sourceOf = (ex: Example): SourceKind =>
    ex.from === "store"
      ? "store"
      : typeof ex.from === "object" && ex.from.subjects
        ? "subjects"
        : "subject";
  const adapt = (ex: Example, a = account, n = subject) => {
    const info = defaults.of(a);
    return adaptExample(
      ex,
      a,
      Number(n) || 0,
      connection?.sealed?.head,
      info?.last ?? Number(n) + 15,
    );
  };
  const load = (ex: Example, a = account, n = subject) => {
    const moved = adapt(ex, a, n);
    setSelected(ex.name);
    setText(formatDatalog(moved.query));
    setSource(sourceOf(ex));
    setNote(moved.note);
    setAnswer(null);
    setError(null);
    if (typeof moved.from === "object" && moved.from.subjects) {
      const list = moved.from.subjects.subjects;
      setSubjectsText(`${list[0]}-${list.at(-1)}`);
    }
    if (moved.basis?.position !== undefined)
      setBasis({ ...basis, recorded: { mode: "position", position: moved.basis.position } });
  };
  /** Moving the source to another account or subject moves the chosen example with it. */
  const reloadExample = (a: string, n: string) => {
    const ex = examples.find((x) => x.name === selected);
    if (ex) load(ex, a, n);
  };
  // Start on the connected database's default subject (from list_accounts), then the default example.
  useEffect(() => {
    if (!defaults.ready || account) return;
    const a = defaults.account!;
    const n = String(defaults.subject!);
    setAccount(a);
    setSubject(n);
    const info = defaults.of(a)!;
    const first = Math.max(info.first, Math.min(Number(n), info.last - 15));
    setSubjectsText(`${first}-${Math.min(info.last, first + 15)}`);
    const s = params.get("saved");
    if (s !== null && saved[Number(s)]) {
      const q = saved[Number(s)]!;
      setSelected("saved:" + q.name);
      setText(q.query);
      setNote(q.note ?? "");
      if (typeof q.source === "object" && q.source && "kind" in q.source)
        setSource((q.source as { kind: SourceKind }).kind);
      setParams({}, { replace: true });
    } else if (!text) load(examples[2]!, a, n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults.ready, params]);

  const from = (): Record<string, unknown> | string =>
    source === "store"
      ? "store"
      : source === "subjects"
        ? { subjects: { account, subjects: parseSubjects(subjectsText) } }
        : entity
          ? { subject: { root: entity } }
          : { subject: { account, subject: Number(subject) } };

  const run = async () => {
    let query: unknown;
    try {
      query = JSON.parse(text);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
      return;
    }
    if (source === "subjects" && parseSubjects(subjectsText).length > 16) {
      setError(
        new ToolError(
          "query",
          0,
          "QueryRefused",
          "One request reads at most 16 subjects at one position.",
        ),
      );
      setAnswer(null);
      return;
    }
    const input = {
      query,
      from: from(),
      basis: toBasis(basis),
      pageSize: 1000,
      explain: source === "store" ? true : undefined,
    };
    const clean = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    setLastCall({ name: "query", input: clean });
    setRunning(true);
    setError(null);
    try {
      const a = await callTool<QueryAnswer>("query", clean);
      setAnswer(a);
      setTab((t) => (t === "plan" && !a.plan ? "table" : t));
    } catch (e) {
      setError(e);
      setAnswer(null);
    } finally {
      setRunning(false);
    }
  };

  const format = () => {
    try {
      setText(formatDatalog(JSON.parse(text)));
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };
  const save = () => {
    const name = window.prompt(
      "Name this question",
      selected.replace(/^saved:/, "") || "My question",
    );
    if (!name) return;
    const next = [
      ...saved.filter((q) => q.name !== name),
      { name, query: text, source: { kind: source, account, subject, subjectsText }, note },
    ];
    setSaved(next);
    saveLocal(SAVED_KEY, next);
    setSelected("saved:" + name);
  };

  const columnDefs = (answer?.columns ?? []).map((c) => (typeof c === "string" ? { name: c } : c));
  const columns = columnDefs.length
    ? columnDefs.map((c) => c.name)
    : answer?.bindings?.[0] && !Array.isArray(answer.bindings[0])
      ? Object.keys(answer.bindings[0])
      : [];
  const columnNote = (c: string) => columnDefs.find((d) => d.name === c)?.note;
  const rows = (answer?.bindings ?? []).map((b) =>
    Array.isArray(b)
      ? Object.fromEntries(columns.map((c, i) => [c, b[i]]))
      : (b as Record<string, unknown>),
  );
  const get = (r: Record<string, unknown>, c: string) =>
    c in r ? r[c] : (r[c.replace(/^\?/, "")] ?? r["?" + c]);
  const tableColumns: ColumnDef<Record<string, unknown>, unknown>[] = columns.map((c) => ({
    id: c,
    header: () => (
      <span>
        {c}
        {columnNote(c) && (
          <span className="text-muted-foreground ml-1 font-normal">({columnNote(c)})</span>
        )}
      </span>
    ),
    accessorFn: (r) => get(r, c) as never,
    cell: (cell) => {
      const v = get(cell.row.original, c);
      const s =
        v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return /^acct\//.test(s) ? (
        <a
          className="font-mono text-xs hover:underline"
          href={`/entities/${encodeURIComponent(s)}`}
        >
          {shortId(s)}
        </a>
      ) : (
        <Mono>{s}</Mono>
      );
    },
  }));
  const numeric = (c: string) =>
    rows.length > 0 &&
    rows.every((r) => typeof get(r, c) === "number" || /^-?\d+(\.\d+)?$/.test(String(get(r, c))));
  const chartable = columns.length === 2 && numeric(columns[1]!) && !numeric(columns[0]!);
  const chartData = chartable
    ? rows.map((r) => ({
        label: shortId(String(get(r, columns[0]!))),
        value: Number(get(r, columns[1]!)),
      }))
    : [];
  const refusal = error instanceof ToolError && error.refused ? error : null;
  const sourceWords =
    source === "store" ? "The store" : source === "subjects" ? "Several subjects" : "One subject";

  const missingTool = tools.isSuccess && !tools.has("query");

  return (
    <div className="-m-4 h-[calc(100svh-5.5rem)] md:-m-6">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="22%" minSize="14%" className="border-r">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-3 text-sm">
              <div className="text-muted-foreground text-xs font-semibold tracking-wide">
                QUESTIONS
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs">Examples</div>
                {examples.map((q) => (
                  <button
                    key={q.name}
                    className={cn(
                      "hover:bg-muted block w-full rounded-sm px-2 py-1 text-left",
                      selected === q.name && "bg-muted font-medium",
                    )}
                    onClick={() => load(q)}
                  >
                    {account ? adapt(q).name : q.name}
                    <span className="text-muted-foreground ml-1 text-xs">
                      {sourceOf(q) === "store" ? "store" : sourceOf(q) === "subjects" ? "16" : ""}
                    </span>
                  </button>
                ))}
              </div>
              <div>
                <div className="text-muted-foreground mb-1 text-xs">Saved</div>
                {saved.length === 0 && (
                  <div className="text-muted-foreground px-2 text-xs">(none yet)</div>
                )}
                {saved.map((q) => (
                  <button
                    key={q.name}
                    className={cn(
                      "hover:bg-muted block w-full rounded-sm px-2 py-1 text-left",
                      selected === "saved:" + q.name && "bg-muted font-medium",
                    )}
                    onClick={() => {
                      setSelected("saved:" + q.name);
                      setText(q.query);
                      setNote(q.note ?? "");
                      const s = q.source as {
                        kind?: SourceKind;
                        account?: string;
                        subject?: string;
                        subjectsText?: string;
                      };
                      if (s?.kind) setSource(s.kind);
                      if (s?.account) setAccount(s.account);
                      if (s?.subject) setSubject(s.subject);
                      if (s?.subjectsText) setSubjectsText(s.subjectsText);
                    }}
                  >
                    {q.name}
                  </button>
                ))}
              </div>
            </div>
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="78%">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize="45%" minSize="20%">
              <div className="flex h-full flex-col gap-2 overflow-auto p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">From</span>
                  <Select value={source} onValueChange={(s) => setSource(s as SourceKind)}>
                    <SelectTrigger className="h-8 w-40" data-testid="query-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subject">One subject</SelectItem>
                      <SelectItem value="subjects">Several subjects</SelectItem>
                      <SelectItem value="store">The store</SelectItem>
                    </SelectContent>
                  </Select>
                  {source !== "store" && (
                    <Select
                      value={account}
                      onValueChange={(a) => {
                        const info = defaults.of(a);
                        const n =
                          info && (Number(subject) < info.first || Number(subject) > info.last)
                            ? String(info.first + Math.floor(info.people / 2))
                            : subject;
                        setAccount(a);
                        setSubject(n);
                        reloadExample(a, n);
                      }}
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {connection?.roster.map((r) => (
                          <SelectItem key={r.account} value={r.account}>
                            {r.account}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {source === "subject" && (
                    <>
                      <Input
                        className="h-8 w-24 tabular-nums"
                        value={subject}
                        onChange={(e) => {
                          const n = e.target.value.replace(/[^\d]/g, "");
                          setSubject(n);
                          setEntity("");
                          if (n) reloadExample(account, n);
                        }}
                        placeholder="subject"
                      />
                      <span className="text-muted-foreground text-xs">or entity</span>
                      <Input
                        className="h-8 w-64 font-mono text-xs"
                        value={entity}
                        onChange={(e) => setEntity(e.target.value.trim())}
                        placeholder={`acct/${account || "account"}/review:00000000`}
                      />
                    </>
                  )}
                  {source === "subjects" && (
                    <Input
                      className="h-8 w-40"
                      value={subjectsText}
                      onChange={(e) => setSubjectsText(e.target.value)}
                      placeholder="0-15 or 1,2,3"
                    />
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {recordedWords(basis)}, {validWords(basis).toLowerCase()}
                  </span>
                </div>
                {note && <p className="text-muted-foreground text-xs">{note}</p>}
                <CodeEditor
                  value={text}
                  onChange={setText}
                  onRun={run}
                  className="min-h-0 flex-1"
                  minHeight="10rem"
                />
                {parseError && (
                  <p className="text-destructive text-xs">The query is not JSON: {parseError}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={run}
                    disabled={running || !tools.has("query")}
                    data-testid="run-query"
                  >
                    Run <Kbd className="bg-primary-foreground/15 text-primary-foreground">⌘↵</Kbd>
                  </Button>
                  <Button variant="outline" onClick={format}>
                    Format
                  </Button>
                  <Button variant="outline" onClick={save}>
                    Save
                  </Button>
                  <div className="ml-auto">
                    <AskAssistant
                      call={{
                        name: "query",
                        input: lastCall?.input ?? {
                          query: (() => {
                            try {
                              return JSON.parse(text);
                            } catch {
                              return text;
                            }
                          })(),
                          from: from(),
                          basis: toBasis(basis),
                        },
                      }}
                      sentence={`${note ? note.split(".")[0] + ". " : ""}Answer this Triplex Datalog question ${source === "store" ? "from the store" : source === "subjects" ? `for subjects ${subjectsText} of ${account} at one position` : `for subject ${subject} of ${account}`}.`}
                    />
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="55%" minSize="15%">
              <div className="h-full space-y-3 overflow-auto p-4" data-testid="query-result">
                {missingTool ? (
                  <NotInCatalogue tool="query" what="Running a question" />
                ) : running ? (
                  <div className="space-y-2">
                    <div className="text-muted-foreground text-xs tabular-nums">
                      Running {(run1.elapsed / 1000).toFixed(1)} s
                    </div>
                    <Slow show={slow}>
                      {source === "store"
                        ? "The store reads the full history of each named entity."
                        : "Pulling the subject and evaluating in the console."}
                    </Slow>
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-40" />
                  </div>
                ) : refusal ? (
                  <Refused reason={refusal.message}>
                    <div className="text-muted-foreground text-xs">
                      Nothing was sent to the store. Source: {sourceWords}.
                    </div>
                  </Refused>
                ) : error ? (
                  <ErrorAlert error={error} />
                ) : !answer ? (
                  <div className="text-muted-foreground py-10 text-center text-sm">
                    Choose an example or write a query, then Run.
                  </div>
                ) : (
                  <>
                    <AnswerLine
                      answer={answer}
                      recorded={recordedWords(basis)}
                      valid={validWords(basis)}
                      extra={
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() =>
                            setBasis({
                              ...basis,
                              recorded: { mode: "position", position: answer.position },
                            })
                          }
                          data-testid="pin"
                        >
                          Pin this position
                        </Button>
                      }
                    />
                    <p className="text-sm">
                      {answer.summary ??
                        answer.answeredBy ??
                        (answer.pulled?.facts !== undefined
                          ? `${plural(answer.pulled.facts, "fact")} in ${plural(answer.pulled.entities ?? 0, "entity", "entities")} pulled at position ${n(answer.position)}, then evaluated in the console.`
                          : "Answered by the store.")}{" "}
                      {answer.total !== undefined && answer.total > rows.length
                        ? `${n(rows.length)} of ${plural(answer.total, "binding")}.`
                        : `${plural(rows.length, "binding")}.`}
                    </p>
                    {answer.note && <p className="text-muted-foreground text-xs">{answer.note}</p>}
                    {answer.route && (
                      <p className="text-muted-foreground text-xs">Route: {answer.route}</p>
                    )}
                    <Tabs value={tab} onValueChange={setTab}>
                      <TabsList>
                        <TabsTrigger value="table">Table</TabsTrigger>
                        <TabsTrigger value="chart" disabled={!chartable}>
                          Chart
                        </TabsTrigger>
                        <TabsTrigger value="plan">Plan</TabsTrigger>
                        <TabsTrigger value="json">JSON</TabsTrigger>
                      </TabsList>
                      <TabsContent value="table" className="mt-3">
                        <DataTable
                          columns={tableColumns}
                          data={rows}
                          pageSize={100}
                          dense
                          empty="No bindings."
                        />
                      </TabsContent>
                      <TabsContent value="chart" className="mt-3">
                        {chartable && (
                          <ChartContainer
                            config={chartConfig}
                            className="aspect-auto w-full"
                            style={{ height: Math.max(160, chartData.length * 26 + 40) }}
                          >
                            <BarChart
                              data={chartData}
                              layout="vertical"
                              margin={{ left: 8, right: 16 }}
                            >
                              <CartesianGrid horizontal={false} />
                              <XAxis type="number" allowDecimals={false} fontSize={11} />
                              <YAxis
                                type="category"
                                dataKey="label"
                                width={180}
                                fontSize={11}
                                tickLine={false}
                              />
                              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                              <Bar
                                dataKey="value"
                                fill="var(--color-value)"
                                radius={3}
                                isAnimationActive={false}
                              />
                            </BarChart>
                          </ChartContainer>
                        )}
                      </TabsContent>
                      <TabsContent value="plan" className="mt-3">
                        {answer.plan ? (
                          <JsonView value={answer.plan} />
                        ) : (
                          <p className="text-muted-foreground text-sm">No plan in this answer.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="json" className="mt-3">
                        <JsonView value={answer} />
                      </TabsContent>
                    </Tabs>
                    {lastCall && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{sourceWords}</Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
