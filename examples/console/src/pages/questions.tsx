// [DX-XQ8] "Ask across subjects": one account, one kind, up to 8 conditions (all required), a list with chosen columns,
// a count or a count per value, as of the latest position, a past position or a past record time, valid now or at
// another instant. The answer comes from the store's slow exact route (ask_across_subjects), one store page per call,
// so the page shows progress page by page and can be stopped. The status line always says the position and valid
// time the answer holds for, how many subjects were examined, whether it is complete and how long it took. Kinds come
// from the ID list (list_kinds), attributes from the first subjects of the kind (describe_kind); protected attributes
// are shown but not offered as filters. Refusals show the store's code and one plain sentence.
// Why: the owner asks questions across subjects himself, with the feel of Metabase's question builder, and sees what
// the store did to answer. Rejected: a single hard-wired account or kind (every picker lists what the database has);
// evaluating in the browser (every answer is the store's).
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PlusIcon, SquareIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnswerLine } from "@/components/console/answer-line";
import { DataTable, Mono } from "@/components/console/data-table";
import { PageTitle } from "@/components/console/layout";
import { ErrorAlert, NotInCatalogue } from "@/components/console/states";
import { useTool, type ToolCall } from "@/hooks/use-tool";
import { callTool, ToolError, type Answer, type Basis } from "@/lib/api";
import { useBasis, type BasisState } from "@/lib/basis";
import { useConnection, useTools } from "@/lib/catalogue";
import { ms, n } from "@/lib/format";
import { cn } from "@/lib/utils";

// ---- shapes of the tools' answers ------------------------------------------------------------------------------------

type KindRow = { prefix: string; shape?: string; label: string; ids: number; countExact: boolean; example: string };
type KindsAnswer = { account: string; kinds: KindRow[]; holdsFor: { position: number | null } };
type AttributeRow = {
  attribute: string;
  valueTypes: string[];
  valueTypeWords: string[];
  seenOn: number;
  protected: boolean;
  filterable: boolean;
  reason?: string;
  examples: string[];
};
type DescribeAnswer = { sampled: number; sampleRule: string; protectedAttributesDeclared: boolean; attributes: AttributeRow[] };
type AskRow = { id: string; columns: Record<string, unknown[]> };
type AskAnswer = {
  rows?: AskRow[];
  count?: number;
  countComplete?: boolean;
  groups?: { value: unknown; type: string | null; subjects: number }[];
  complete: boolean;
  next: string | null;
  holdsFor: { position: number; validAt: string; validAtMs: number; asked: string; headWhenAnswered: number };
  progress: { subjectsExamined: number; subjectsWithFacts: number; matched: number; idsListed: number; storePages: number; relatedRead?: number; relatedRows?: number };
  top?: { n: number; order: { by: string; type: string; direction: string } | null; kept: number; meaning: string };
  sum?: { of: string; sum: string; valuesAdded: number; subjectsWithValue: number; skipped: number; average: { numerator: string; denominator: string; decimal: string; rounding: string } | null; countComplete: boolean; meaning: string };
  facts: "stored";
  factsMeaning: string;
  route: {
    used: string;
    how: string;
    pages: { examined: number; matched: number; rows: number; stopped: string; storeMs: number; busyRetries: number }[];
    rowsRead: number;
    storage: { segmentsLoaded: number; listMs: number; readMs: number; evaluateMs: number; queueMs: number; cpuMs: number; note: string };
    busyRetries: number;
    fastIndex: { available: boolean; name: string; status: string; whatItWillChange: string };
  };
};

// ---- the question being built ------------------------------------------------------------------------------------

type Op = "eq" | "ne" | "in" | "range" | "prefix" | "contains" | "exists" | "missing" | "has";
type Quantifier = "some" | "none" | "gte" | "lte" | "eq";
type ValueKind = "text" | "reference" | "integer" | "number" | "date" | "boolean";
type Draft = {
  key: number;
  attribute: string;
  op: Op;
  type: ValueKind;
  value: string;
  values: string;
  from: string;
  to: string;
  fromExclusive: boolean;
  toExclusive: boolean;
  /** [DX-XQ9] contains: ignore case. */
  caseInsensitive: boolean;
  /** [DX-XQ9] has: the related kind, how it is tied, the quantifier and the related entities' own conditions. */
  related: { prefix: string; shape: string; link: "key" | "ref"; ref: string };
  quantifier: Quantifier;
  count: string;
  inner: Draft[];
};
type ResultKind = "list" | "count" | "countByValue" | "top" | "sum";
type OrderDraft = { by: string; type: ValueKind; direction: "asc" | "desc"; n: number };
type Question = {
  account: string;
  kind: { prefix: string; shape?: string };
  where: Record<string, unknown>[];
  anyOf?: Record<string, unknown>[][];
  result: ResultKind;
  order?: { by: string; type: string; direction: "asc" | "desc" };
  limit?: number;
  columns?: string[];
  of?: string;
  basis?: Basis;
  pageSubjects?: number;
};

const OPS: { op: Op; words: string }[] = [
  { op: "eq", words: "is" },
  { op: "ne", words: "is not" },
  { op: "in", words: "is one of" },
  { op: "range", words: "is between" },
  { op: "prefix", words: "starts with" },
  { op: "contains", words: "contains" },
  { op: "exists", words: "has a value" },
  { op: "missing", words: "has no value" },
];
const VALUE_KINDS: { kind: ValueKind; words: string }[] = [
  { kind: "text", words: "text" },
  { kind: "reference", words: "reference" },
  { kind: "integer", words: "integer" },
  { kind: "number", words: "number" },
  { kind: "date", words: "date (UTC)" },
  { kind: "boolean", words: "yes or no" },
];
const kindOfFamily = (family: string | undefined): ValueKind =>
  family === "ref" ? "reference"
  : family === "integer" ? "integer"
  : family === "number" ? "number"
  : family === "datetime" ? "date"
  : family === "boolean" ? "boolean"
  : "text";

let nextKey = 1;
const blankDraft = (attribute = "", type: ValueKind = "text"): Draft => ({
  key: nextKey++, attribute, op: "eq", type, value: "", values: "", from: "", to: "", fromExclusive: false, toExclusive: false,
  caseInsensitive: false, related: { prefix: "", shape: "", link: "key", ref: "" }, quantifier: "some", count: "1", inner: [],
});
const blankHas = (prefix = ""): Draft => ({ ...blankDraft(), op: "has", related: { prefix, shape: "", link: "key", ref: "" } });
/** Conditions a question holds in all (a has condition counts one plus its own); the store's bound is 8. */
const conditionCount = (ds: Draft[]) => ds.reduce((n, d) => n + 1 + (d.op === "has" ? d.inner.length : 0), 0);

/** A value as typed into the page, in the tool's form: dates as ISO in UTC, the rest as text the store converts. */
const wireValue = (kind: ValueKind, raw: string) =>
  kind === "date" ? (raw.length === 16 ? raw + ":00Z" : /Z$|[+-]\d\d:\d\d$/.test(raw) ? raw : raw + "Z") : raw.trim();

function draftToCondition(d: Draft): { condition?: Record<string, unknown>; problem?: string } {
  if (d.op === "has") {
    if (!d.related.prefix) return { problem: "Choose the related kind." };
    if (d.related.link === "ref" && !d.related.ref) return { problem: "Choose the reference attribute that ties the related entities." };
    const inner = d.inner.map(draftToCondition);
    const problem = inner.find((x) => x.problem)?.problem;
    if (problem) return { problem };
    const count = Number(d.count);
    if (["gte", "lte", "eq"].includes(d.quantifier) && !(Number.isInteger(count) && count >= 0 && count <= 1000)) return { problem: "Give a count from 0 to 1,000." };
    return {
      condition: {
        op: "has",
        related: { prefix: d.related.prefix, ...(d.related.shape ? { shape: d.related.shape } : {}), link: d.related.link === "ref" ? { ref: d.related.ref } : "key" },
        ...(inner.length ? { where: inner.map((x) => x.condition!) } : {}),
        quantifier: d.quantifier === "some" || d.quantifier === "none" ? d.quantifier : { op: d.quantifier, value: count },
      },
    };
  }
  if (!d.attribute) return { problem: "Choose an attribute." };
  const base = { attribute: d.attribute, op: d.op, type: d.type };
  switch (d.op) {
    case "contains":
      return d.value === "" ? { problem: `Give the text ${d.attribute} contains.` } : { condition: { attribute: d.attribute, op: "contains", value: d.value, ...(d.caseInsensitive ? { caseInsensitive: true } : {}) } };
    case "eq":
    case "ne":
    case "prefix":
      return d.value.trim() === "" ? { problem: `Give a value for ${d.attribute}.` } : { condition: { ...base, value: wireValue(d.type, d.value) } };
    case "in": {
      const values = d.values.split(",").map((v) => v.trim()).filter(Boolean);
      return values.length ? { condition: { ...base, values: values.map((v) => wireValue(d.type, v)) } } : { problem: `Give one or more values for ${d.attribute}, separated by commas.` };
    }
    case "range":
      if (!d.from.trim() && !d.to.trim()) return { problem: `Give a lower end, an upper end or both for ${d.attribute}.` };
      return {
        condition: {
          ...base,
          ...(d.from.trim() ? { from: wireValue(d.type, d.from), ...(d.fromExclusive ? { fromExclusive: true } : {}) } : {}),
          ...(d.to.trim() ? { to: wireValue(d.type, d.to), ...(d.toExclusive ? { toExclusive: true } : {}) } : {}),
        },
      };
    case "exists":
    case "missing":
      return { condition: { attribute: d.attribute, op: d.op } };
  }
}

function conditionToDraft(c: Record<string, unknown>): Draft {
  if (c["op"] === "has") {
    const r = (c["related"] ?? {}) as { prefix?: string; shape?: string; link?: "key" | { ref: string } };
    const q = c["quantifier"] as string | { op: Quantifier; value: number } | undefined;
    return {
      ...blankHas(r.prefix ?? ""),
      related: { prefix: r.prefix ?? "", shape: r.shape ?? "", link: typeof r.link === "object" ? "ref" : "key", ref: typeof r.link === "object" ? r.link.ref : "" },
      quantifier: typeof q === "object" ? q.op : ((q as Quantifier | undefined) ?? "some"),
      count: typeof q === "object" ? String(q.value) : "1",
      inner: ((c["where"] as Record<string, unknown>[] | undefined) ?? []).map(conditionToDraft),
    };
  }
  const type = String(c["type"] ?? "text");
  const kind: ValueKind = (["text", "reference", "integer", "number", "date", "boolean"] as string[]).includes(type) ? (type as ValueKind) : type === "ref" ? "reference" : type === "datetime" ? "date" : "text";
  const show = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "object" ? String((v as { value: unknown }).value) : String(v));
  return {
    ...blankDraft(String(c["attribute"] ?? ""), kind),
    op: (c["op"] as Op) ?? "eq",
    value: show(c["value"]),
    values: Array.isArray(c["values"]) ? (c["values"] as unknown[]).map(show).join(", ") : "",
    from: show(c["from"]),
    to: show(c["to"]),
    fromExclusive: c["fromExclusive"] === true,
    toExclusive: c["toExclusive"] === true,
    caseInsensitive: c["caseInsensitive"] === true,
  };
}

// ---- the example questions: the product's own list (design of 2026-11-24, section 3), on this database's layout ------

type Example = {
  id: string;
  product: string;
  title: string;
  note: string;
  kind: { prefix: string; shape?: string };
  where?: Record<string, unknown>[];
  anyOf?: Record<string, unknown>[][];
  result: ResultKind;
  order?: { by: string; type: string; direction: "asc" | "desc" };
  limit?: number;
  columns?: string[];
  of?: string;
};
const examplesFor = (account: string): Example[] => [
  { id: "subjects", product: "S1", title: "Every subject of the account", note: "A list of one kind, in ID order, with two columns.", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, result: "list", columns: [":placement/status", ":subject/member"] },
  { id: "pending", product: "S3", title: "Tasks whose status is pending", note: "Equality on a status.", kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "eq", type: "text", value: "pending" }], result: "list", columns: [":i9/status", ":task/progress"] },
  { id: "no-status", product: "S3", title: "Tasks with no status", note: "\"Has no value\" on a status.", kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "missing" }], result: "count" },
  { id: "pending-progress", product: "S4, S5", title: "Pending tasks with progress from 20 to 60", note: "Two conditions together; a range on an integer.", kind: { prefix: "i9:" }, where: [{ attribute: ":i9/status", op: "eq", type: "text", value: "pending" }, { attribute: ":task/progress", op: "range", type: "integer", from: "20", to: "60" }], result: "list", columns: [":task/progress"] },
  { id: "per-status", product: "S6", title: "Tasks per status", note: "A count per value; tasks without one count under \"no value\".", kind: { prefix: "i9:" }, result: "countByValue", of: ":i9/status" },
  { id: "active", product: "S6", title: "How many subjects are active", note: "A count with one condition.", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ attribute: ":placement/status", op: "eq", type: "text", value: "active" }], result: "count" },
  { id: "reviews-of", product: "S2", title: "Reviews of subject 7", note: "Equality on a reference to another entity.", kind: { prefix: "review:" }, where: [{ attribute: ":review/of", op: "eq", type: "reference", value: `acct/${account}/pl:00000007` }], result: "list", columns: [":review/outcome", ":review/decided-on"] },
  { id: "pay", product: "S5", title: "Profiles paid at least 1,400 cents", note: "A range with one end.", kind: { prefix: "wk:" }, where: [{ attribute: ":person/custom-pay-cents", op: "range", type: "integer", from: "1400" }], result: "list", columns: [":person/custom-pay-cents"] },
  { id: "start", product: "S8", title: "Profiles whose start date text starts with 2026-11", note: "\"Starts with\".", kind: { prefix: "wk:" }, where: [{ attribute: ":person/custom-start", op: "prefix", type: "text", value: "2026-11" }], result: "list", columns: [":person/custom-start"] },
  { id: "contains", product: "S8", title: "Profiles whose address contains \"main st\", any case", note: "\"Contains\", read in each profile (no index).", kind: { prefix: "wk:" }, where: [{ attribute: ":worker/address", op: "contains", value: "main st", caseInsensitive: true }], result: "count" },
  { id: "has-pending", product: "S10", title: "Subjects with at least one pending task", note: "A condition on each subject's tasks (same number after the kind).", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ op: "has", related: { prefix: "i9:", link: "key" }, quantifier: "some", where: [{ attribute: ":i9/status", op: "eq", type: "text", value: "pending" }] }], result: "list", columns: [":placement/status"] },
  { id: "has-open", product: "S10", title: "Subjects with 3 or more open tasks", note: "A count of each subject's tasks whose status is not complete (no status counts as not complete).", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ op: "has", related: { prefix: "i9:", link: "key" }, quantifier: { op: "gte", value: 3 }, where: [{ attribute: ":task/status", op: "ne", type: "text", value: "complete" }] }], result: "count" },
  { id: "has-none", product: "S10", title: "Subjects with no ended placement", note: "\"None\" over the placements a subject points to.", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, where: [{ op: "has", related: { prefix: "pl:", shape: "pl:{8 digits}:p{digits}", link: { ref: ":person/placement" } }, quantifier: "none", where: [{ attribute: ":placement/status", op: "eq", type: "text", value: "ended" }] }], result: "count" },
  { id: "subject-active", product: "S7, S10", title: "Tasks whose subject is active", note: "The reverse: a condition on each task's subject.", kind: { prefix: "i9:" }, where: [{ op: "has", related: { prefix: "pl:", shape: "pl:{8 digits}", link: "key" }, where: [{ attribute: ":placement/status", op: "eq", type: "text", value: "active" }] }], result: "count" },
  { id: "top-pay", product: "S9", title: "Top 10 profiles by pay, highest first", note: "Top N: every profile read once; ties by ID.", kind: { prefix: "wk:" }, result: "top", order: { by: ":person/custom-pay-cents", type: "integer", direction: "desc" }, limit: 10 },
  { id: "not-pending-or", product: "S3, S4", title: "Tasks not pending, or with progress under 10", note: "\"Is not\" and \"any of these groups\".", kind: { prefix: "i9:" }, anyOf: [[{ attribute: ":i9/status", op: "ne", type: "text", value: "pending" }], [{ attribute: ":task/progress", op: "range", type: "integer", toExclusive: true, to: "10" }]], result: "count" },
  { id: "sum-pay", product: "S13", title: "Total and average pay of the profiles", note: "An exact sum of an integer attribute.", kind: { prefix: "wk:" }, result: "sum", of: ":person/custom-pay-cents" },
  { id: "total", product: "S11", title: "How many subjects in all", note: "The total a re-evaluation pages through.", kind: { prefix: "pl:", shape: "pl:{8 digits}" }, result: "count" },
];

// ---- the run: one store page per call, accumulated here ------------------------------------------------------------

type Run = {
  question: Question;
  call: ToolCall;
  running: boolean;
  stoppedByYou: boolean;
  last?: Answer<AskAnswer>;
  rows: AskRow[];
  pages: AskAnswer["route"]["pages"];
  cursor: string | null;
  complete: boolean;
  examined: number;
  listed: number;
  matched: number;
  rowsRead: number;
  related: number;
  segments: number;
  storeMs: number;
  roundTripMs: number;
  listMs: number;
  readMs: number;
  evaluateMs: number;
  queueMs: number;
  busyRetries: number;
  /** Set while the store answered busy (503 SweepBusy or IndexBusy) and the page waits retryAfterMs to ask again. */
  busy?: { code: string; retryAfterMs: number; attempt: number };
  startedAt: number;
  elapsedMs: number;
  error?: unknown;
};
const PAGE = 25;

function useRunner() {
  const [run, setRun] = useState<Run | null>(null);
  const abort = useRef<AbortController | null>(null);
  const live = useRef<Run | null>(null);
  const set = (r: Run) => {
    live.current = r;
    setRun({ ...r });
  };

  /** Ask (fresh) or continue (more rows, or after a stop) until `wantRows` rows, the end, a stop or a refusal. */
  async function go(question: Question, opts: { fresh: boolean; wantRows?: number }) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    let r: Run =
      opts.fresh || !live.current
        ? {
            question,
            call: { name: "ask_across_subjects", input: question as unknown as Record<string, unknown> },
            running: true, stoppedByYou: false, rows: [], pages: [], cursor: null, complete: false,
            examined: 0, listed: 0, matched: 0, rowsRead: 0, related: 0, segments: 0, storeMs: 0, roundTripMs: 0,
            listMs: 0, readMs: 0, evaluateMs: 0, queueMs: 0, busyRetries: 0, startedAt: performance.now(), elapsedMs: 0,
          }
        : { ...live.current, running: true, stoppedByYou: false, error: undefined };
    const spentBefore = r.elapsedMs;
    const resumedAt = performance.now();
    set(r);
    const want = opts.wantRows ?? PAGE;
    try {
      for (;;) {
        const { basis, ...rest } = r.question;
        const input: Record<string, unknown> = {
          ...rest,
          mode: "page",
          ...(r.question.result === "list" ? { limit: Math.max(1, Math.min(1000, want - r.rows.length)) } : {}),
          ...(r.cursor ? { cursor: r.cursor } : basis ? { basis } : {}),
        };
        let a: Answer<AskAnswer> | undefined;
        for (let attempt = 1; !a; attempt++) {
          try {
            a = await callTool<AskAnswer>("ask_across_subjects", input, controller.signal);
          } catch (error) {
            const busy = error instanceof ToolError && (error.detail as { busy?: boolean }).busy === true;
            if (!busy || attempt >= 60 || controller.signal.aborted) throw error;
            const wait = Math.min(5000, Math.max(100, Number((error as ToolError).detail["retryAfterMs"] ?? 500)));
            r = { ...r, busy: { code: (error as ToolError).code, retryAfterMs: wait, attempt }, busyRetries: r.busyRetries + 1 };
            set(r);
            await new Promise((ok) => setTimeout(ok, wait));
          }
        }
        if (!a) throw new Error("No answer");
        r = { ...r, busy: undefined };
        const s = a.route.storage;
        r = {
          ...r,
          last: a,
          rows: [...r.rows, ...(a.rows ?? [])],
          pages: [...r.pages, ...a.route.pages],
          cursor: a.next,
          complete: a.complete,
          examined: r.examined + a.progress.subjectsExamined,
          listed: r.listed + a.progress.idsListed,
          matched: r.matched + a.progress.matched,
          rowsRead: r.rowsRead + a.route.rowsRead,
          related: r.related + (a.progress.relatedRead ?? 0),
          segments: r.segments + s.segmentsLoaded,
          storeMs: r.storeMs + (a.timing.serverMs ?? 0),
          roundTripMs: r.roundTripMs + a.timing.roundTripMs,
          listMs: r.listMs + s.listMs,
          readMs: r.readMs + s.readMs,
          evaluateMs: r.evaluateMs + s.evaluateMs,
          queueMs: r.queueMs + s.queueMs,
          busyRetries: r.busyRetries + a.route.busyRetries,
          elapsedMs: spentBefore + performance.now() - resumedAt,
        };
        set(r);
        if (a.complete || controller.signal.aborted) break;
        if (r.question.result === "list" && r.rows.length >= want) break;
      }
      set({ ...r, running: false, elapsedMs: spentBefore + performance.now() - resumedAt });
    } catch (error) {
      const stopped = controller.signal.aborted;
      set({ ...r, running: false, stoppedByYou: stopped, ...(stopped ? {} : { error }), elapsedMs: spentBefore + performance.now() - resumedAt });
    }
  }
  const stop = () => abort.current?.abort();
  const clear = () => {
    abort.current?.abort();
    live.current = null;
    setRun(null);
  };
  useEffect(() => () => abort.current?.abort(), []);
  return { run, go, stop, clear };
}

// ---- pieces --------------------------------------------------------------------------------------------------------

/** A refusal: the store's code and one plain sentence; an error otherwise. */
function QuestionRefusal({ error }: { error: unknown }) {
  const e = error instanceof ToolError ? error : null;
  const d = (e?.detail ?? {}) as { refused?: boolean; explanation?: string; storeCode?: string; storeMessage?: string };
  if (!e || !d.refused) return <ErrorAlert error={error} />;
  return (
    <Alert data-testid="question-refused">
      <AlertTitle className="flex items-center gap-2">
        Refused <Badge variant="outline" className="font-mono">{e.code}</Badge>
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-1">
          <div>{d.explanation ?? e.message}</div>
          {d.storeMessage && <div className="text-xs opacity-80">The store said: {d.storeMessage}</div>}
        </div>
      </AlertDescription>
    </Alert>
  );
}

const day = (iso: string | null | undefined) => (iso ? iso.replace("T", " ").replace(/\.\d+Z$|Z$/, "") + " UTC" : "");

/** The status line: what the answer holds for, how much was read, whether it is complete, how long it took. */
function StatusLine({ run }: { run: Run }) {
  const h = run.last?.holdsFor;
  const state = run.running ? "running" : run.complete ? "complete" : "partial";
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="question-status" data-state={state}>
      {h ? (
        <>
          <Badge variant="outline" className="font-normal tabular-nums">Holds for position {n(h.position)}</Badge>
          <Badge variant="outline" className="font-normal tabular-nums">Valid at {day(h.validAt)}</Badge>
        </>
      ) : (
        <Badge variant="outline" className="font-normal">Position and valid time arrive with the first page</Badge>
      )}
      <Badge variant="outline" className="font-normal tabular-nums">{n(run.examined)} subjects examined</Badge>
      {run.running && run.busy ? (
        <Badge variant="secondary" className="gap-1 font-normal" data-testid="busy">
          <Spinner className="size-3" /> Busy, retrying in {n(run.busy.retryAfterMs)} ms ({run.busy.code}, try {run.busy.attempt})
        </Badge>
      ) : run.running ? (
        <Badge variant="secondary" className="gap-1 font-normal"><Spinner className="size-3" /> Reading page {run.pages.length + 1}</Badge>
      ) : run.complete ? (
        <Badge variant="secondary" className="font-normal" data-testid="complete">Complete</Badge>
      ) : run.error ? (
        <Badge variant="destructive" className="font-normal" data-testid="not-complete">Not answered</Badge>
      ) : (
        <Badge variant="default" className="font-normal" data-testid="not-complete">
          Not complete{run.stoppedByYou ? ": stopped by you" : ""}
        </Badge>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="font-normal tabular-nums">Took {ms(run.elapsedMs)}</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Wall time of this question on this page, {n(run.pages.length)} store pages. The store's own time: {ms(run.storeMs)}. Times on the Mac are diagnostic.
        </TooltipContent>
      </Tooltip>
      <Badge variant="outline" className="font-normal tabular-nums">Store {ms(run.storeMs)}</Badge>
      <Badge variant="outline" className="font-normal">Stored facts</Badge>
    </div>
  );
}

/** [DX-XQ8] FAST-INDEX SLOT: where the commit-time index's fast answer will be offered beside this slow exact one. */
function FastIndexSlot({ fast }: { fast?: AskAnswer["route"]["fastIndex"] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2 text-xs" data-testid="fast-index-slot">
      <Button size="sm" variant="outline" disabled>
        {fast?.name ?? "Fast answer from the index"}
      </Button>
      <span className="text-muted-foreground">
        Not available yet: {fast?.status ?? "the commit-time index is a separate branch"}. {fast?.whatItWillChange ?? ""}
      </span>
    </div>
  );
}

function HowAnswered({ run, kind }: { run: Run; kind?: KindRow }) {
  const r = run.last?.route;
  return (
    <Card className="gap-3 py-4" data-testid="how-answered">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">How this was answered</CardTitle>
        <CardDescription className="text-xs">
          {r?.how ?? "The store lists the kind's IDs in order and reads each subject at one position and one valid time."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 text-sm">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          <Fact label="Route">{r?.used ?? "slow exact read of each subject"}</Fact>
          <Fact label="Store pages">{n(run.pages.length)}</Fact>
          <Fact label="IDs listed">{n(run.listed)}</Fact>
          <Fact label="Subjects examined">{n(run.examined)}</Fact>
          <Fact label="Matched">{n(run.matched)}</Fact>
          <Fact label="Fact rows read">{n(run.rowsRead)}</Fact>
          {run.related > 0 && <Fact label="Related entities read">{n(run.related)}</Fact>}
          <Fact label="Storage segments loaded">{n(run.segments)}</Fact>
          <Fact label="Waits for a turn">{n(run.busyRetries)}</Fact>
          <Fact label="Listing">{ms(run.listMs)}</Fact>
          <Fact label="Reading subjects">{ms(run.readMs)}</Fact>
          <Fact label="Testing conditions">{ms(run.evaluateMs)}</Fact>
          <Fact label="Queue">{ms(run.queueMs)}</Fact>
        </div>
        {kind && (
          <p className="text-muted-foreground text-xs">
            The kind picker's count ({n(kind.ids)} IDs{kind.countExact ? "" : ", at least"}) came from the ID list route:
            IDs with a fact recorded by the position, live or retired. This question counts only subjects with a fact
            valid at the chosen time.
          </p>
        )}
        {run.pages.length > 0 && (
          <div className="text-muted-foreground flex flex-wrap gap-1 text-xs" data-testid="page-strip">
            {run.pages.slice(-40).map((p, i) => (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <span className={cn("inline-block h-3 w-2 rounded-sm", p.matched ? "bg-primary" : "bg-muted-foreground/30")} />
                </TooltipTrigger>
                <TooltipContent>
                  Page {Math.max(0, run.pages.length - 40) + i + 1}: {p.examined} examined, {p.matched} matched, {p.rows} rows, {ms(p.storeMs)}, stopped by {p.stopped}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
        <FastIndexSlot fast={r?.fastIndex} />
        <p className="text-muted-foreground text-xs">{run.last?.factsMeaning ?? "Stored facts only."}</p>
      </CardContent>
    </Card>
  );
}
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="tabular-nums">{children}</div>
    </div>
  );
}

/** The as-of and valid-time controls, bound to the console's one basis (the header's control shows the same). */
function WhenControls() {
  const { basis, setBasis } = useBasis();
  const [position, setPosition] = useState(basis.recorded.mode === "position" ? String(basis.recorded.position) : "");
  const [recordedAt, setRecordedAt] = useState(basis.recorded.mode === "recordedAt" ? basis.recorded.at.slice(0, 16) : "");
  const [validOn, setValidOn] = useState(basis.valid.mode === "date" ? basis.valid.date.slice(0, 16) : "");
  useEffect(() => {
    if (basis.recorded.mode === "position") setPosition(String(basis.recorded.position));
    if (basis.recorded.mode === "recordedAt") setRecordedAt(basis.recorded.at.slice(0, 16));
    if (basis.valid.mode === "date") setValidOn(basis.valid.date.slice(0, 16));
  }, [basis]);
  const apply = (next: BasisState) => setBasis(next);
  const mode = basis.recorded.mode;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="when-controls">
      <span className="text-muted-foreground w-14">As of</span>
      <Select
        value={mode}
        onValueChange={(m) =>
          apply({
            ...basis,
            recorded:
              m === "position" && /^\d+$/.test(position) ? { mode: "position", position: Number(position) }
              : m === "recordedAt" && recordedAt ? { mode: "recordedAt", at: recordedAt + "Z" }
              : m === "latest" ? { mode: "latest" }
              : m === "position" ? { mode: "position", position: 0 }
              : { mode: "recordedAt", at: new Date().toISOString().slice(0, 16) + "Z" },
          })
        }
      >
        <SelectTrigger size="sm" className="w-44" data-testid="as-of-mode"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="latest">Now (latest position)</SelectItem>
          <SelectItem value="position">A past position</SelectItem>
          <SelectItem value="recordedAt">A past record time</SelectItem>
        </SelectContent>
      </Select>
      {mode === "position" && (
        <Input
          className="h-8 w-32 tabular-nums"
          inputMode="numeric"
          value={position}
          onChange={(e) => setPosition(e.target.value.replace(/\D/g, ""))}
          onBlur={() => /^\d+$/.test(position) && apply({ ...basis, recorded: { mode: "position", position: Number(position) } })}
          onKeyDown={(e) => e.key === "Enter" && /^\d+$/.test(position) && apply({ ...basis, recorded: { mode: "position", position: Number(position) } })}
          data-testid="as-of-position"
        />
      )}
      {mode === "recordedAt" && (
        <Input
          type="datetime-local"
          className="h-8 w-52"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          onBlur={() => recordedAt && apply({ ...basis, recorded: { mode: "recordedAt", at: recordedAt + "Z" } })}
          data-testid="as-of-time"
        />
      )}
      <Separator orientation="vertical" className="mx-1 h-5" />
      <span className="text-muted-foreground">Valid at</span>
      <Select
        value={basis.valid.mode}
        onValueChange={(m) =>
          apply({ ...basis, valid: m === "now" ? { mode: "now" } : { mode: "date", date: (validOn || new Date().toISOString().slice(0, 16)) + "Z" } })
        }
      >
        <SelectTrigger size="sm" className="w-40" data-testid="valid-mode"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="now">Now</SelectItem>
          <SelectItem value="date">Another time</SelectItem>
        </SelectContent>
      </Select>
      {basis.valid.mode === "date" && (
        <Input
          type="datetime-local"
          className="h-8 w-52"
          value={validOn}
          onChange={(e) => setValidOn(e.target.value)}
          onBlur={() => validOn && apply({ ...basis, valid: { mode: "date", date: validOn + "Z" } })}
          data-testid="valid-time"
        />
      )}
      <span className="text-muted-foreground text-xs">Times are UTC.</span>
    </div>
  );
}

/** The question's basis in the tool's form (position or record time, and valid time). */
function questionBasis(b: BasisState): Basis | undefined {
  const out: Basis = {};
  if (b.recorded.mode === "position") out.position = b.recorded.position;
  if (b.recorded.mode === "recordedAt") out.recordedAt = new Date(b.recorded.at).toISOString();
  if (b.valid.mode === "date") out.validAt = new Date(b.valid.date).toISOString();
  return Object.keys(out).length ? out : undefined;
}
/** The ID list's basis: no valid time (an ID list has no valid-time axis). */
function listBasis(b: BasisState): Basis | undefined {
  const { validAt: _v, ...rest } = questionBasis(b) ?? {};
  return Object.keys(rest).length ? rest : undefined;
}

const cellValue = (vs: unknown[] | undefined) =>
  !vs || vs.length === 0 ? <span className="text-muted-foreground">no value</span> : vs.map((v) => (v === null ? "null" : String(v))).join(", ");

function entityLink(id: string, roster: { account: string }[], position: number, validAt: string) {
  const at = `recorded=${position}&valid=${encodeURIComponent(validAt)}`;
  const m = /^acct\/([^/]+)\/pl:(\d{8})$/.exec(id);
  if (m && roster.some((r) => r.account === m[1])) return { to: `/accounts/${m[1]}/subjects/${Number(m[2])}?${at}`, subject: Number(m[2]) };
  return { to: `/entities/${encodeURIComponent(id)}?${at}`, subject: null };
}

// ---- the page ----------------------------------------------------------------------------------------------------

export function QuestionsPage() {
  const tools = useTools();
  const connection = useConnection();
  const roster = connection.data?.roster ?? [];
  const { basis } = useBasis();
  const [params, setParams] = useSearchParams();
  const asked = useMemo(() => {
    try {
      const text = params.get("ask");
      return text ? (JSON.parse(text) as Partial<Question>) : null;
    } catch {
      return null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- read once, when the page opens from a link

  const [account, setAccount] = useState<string>(String(asked?.account ?? ""));
  const [kindKey, setKindKey] = useState<string>(asked?.kind ? JSON.stringify([asked.kind.prefix, asked.kind.shape ?? ""]) : "");
  const [drafts, setDrafts] = useState<Draft[]>(() => (asked?.where ?? []).map((c) => conditionToDraft(c)));
  const [groups, setGroups] = useState<Draft[][]>(() => (asked?.anyOf ?? []).map((g) => g.map((c) => conditionToDraft(c))));
  const [order, setOrder] = useState<OrderDraft>(() => ({
    by: asked?.order?.by ?? "", type: kindOfFamily(asked?.order?.type), direction: asked?.order?.direction ?? "desc", n: asked?.limit ?? 10,
  }));
  const [result, setResult] = useState<ResultKind>(asked?.result ?? "list");
  const [columns, setColumns] = useState<string[]>(asked?.columns ?? []);
  const [of, setOf] = useState<string>(asked?.of ?? "");
  const [resultPage, setResultPage] = useState(0);
  const [pageSubjects, setPageSubjects] = useState<number>(asked?.pageSubjects ?? 256);
  const [pendingExample, setPendingExample] = useState<Example | null>(null);
  const { run, go, stop, clear } = useRunner();

  // Every account of the database is offered; the default is the third (account-003) when there is one.
  useEffect(() => {
    if (!account && roster.length) setAccount((roster[2] ?? roster[0])!.account);
  }, [roster, account]);

  const kinds = useTool<KindsAnswer>(
    "list_kinds",
    { account, basis: listBasis(basis) },
    { enabled: Boolean(account) && tools.has("list_kinds"), keepPrevious: true },
  );
  const kindList = kinds.data?.account === account ? kinds.data.kinds : [];
  const kind = kindList.find((k) => JSON.stringify([k.prefix, k.shape ?? ""]) === kindKey);
  // Default kind: the subjects' root records when the account has them, else the first kind.
  useEffect(() => {
    if (!kindList.length || kind) return;
    const preferred = kindList.find((k) => k.prefix === "pl:" && k.shape) ?? kindList[0]!;
    setKindKey(JSON.stringify([preferred.prefix, preferred.shape ?? ""]));
  }, [kindList, kind]);
  const [prefix, shape] = kindKey ? (JSON.parse(kindKey) as [string, string]) : ["", ""];

  const described = useTool<DescribeAnswer>(
    "describe_kind",
    { account, prefix, ...(shape ? { shape } : {}), basis: questionBasis(basis), sample: 50 },
    { enabled: Boolean(account && kindKey) && tools.has("describe_kind"), keepPrevious: true },
  );
  const attributes = described.data?.attributes ?? [];
  const filterable = attributes.filter((a) => a.filterable);
  const notFilterable = attributes.filter((a) => !a.filterable);
  const byName = new Map(attributes.map((a) => [a.attribute, a]));

  // An example chosen before its kind's attributes were known runs once they are.
  useEffect(() => {
    if (!pendingExample || !kind || kind.prefix !== pendingExample.kind.prefix || (kind.shape ?? "") !== (pendingExample.kind.shape ?? "")) return;
    setPendingExample(null);
    ask();
  }, [pendingExample, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const built = drafts.map(draftToCondition);
  const builtGroups = groups.map((g) => g.map(draftToCondition));
  const problems = [...built, ...builtGroups.flat()].map((b) => b.problem).filter(Boolean) as string[];
  if (result === "countByValue" && !of) problems.push("Choose the attribute to count by.");
  if (result === "sum" && !of) problems.push("Choose the integer attribute to add.");
  if (result === "top" && !order.by) problems.push("Choose the attribute to order by.");
  const conditionsUsed = conditionCount(drafts) + groups.reduce((n, g) => n + conditionCount(g), 0);
  if (conditionsUsed > 8) problems.push(`${conditionsUsed} conditions; the store takes 8 in all (a "has" counts one plus its own).`);
  const question: Question | null =
    account && kindKey && !problems.length
      ? {
          account,
          kind: shape ? { prefix, shape } : { prefix },
          where: built.map((b) => b.condition!),
          ...(groups.length ? { anyOf: builtGroups.map((g) => g.map((b) => b.condition!)) } : {}),
          result,
          ...(result === "top" ? { order: { by: order.by, type: order.type, direction: order.direction }, limit: order.n } : {}),
          ...(result === "list" && columns.length ? { columns } : {}),
          ...(result === "countByValue" || result === "sum" ? { of } : {}),
          ...(questionBasis(basis) ? { basis: questionBasis(basis)! } : {}),
          ...(pageSubjects !== 256 ? { pageSubjects } : {}),
        }
      : null;

  function ask(q: Question | null = question) {
    if (!q) return;
    setResultPage(0);
    setParams((p) => (p.set("ask", JSON.stringify({ ...q, basis: undefined })), p), { replace: true });
    void go(q, { fresh: true, wantRows: PAGE });
  }
  function choose(e: Example) {
    clear();
    setKindKey(JSON.stringify([e.kind.prefix, e.kind.shape ?? ""]));
    setDrafts((e.where ?? []).map((c) => conditionToDraft(c)));
    setGroups((e.anyOf ?? []).map((g) => g.map((c) => conditionToDraft(c))));
    if (e.order) setOrder({ by: e.order.by, type: kindOfFamily(e.order.type), direction: e.order.direction, n: e.limit ?? 10 });
    setResult(e.result);
    setColumns(e.columns ?? []);
    setOf(e.of ?? "");
    const q: Question = {
      account,
      kind: e.kind,
      where: (e.where ?? []).map((c) => draftToCondition(conditionToDraft(c)).condition!),
      ...(e.anyOf ? { anyOf: e.anyOf.map((g) => g.map((c) => draftToCondition(conditionToDraft(c)).condition!)) } : {}),
      result: e.result,
      ...(e.order ? { order: { by: e.order.by, type: kindOfFamily(e.order.type), direction: e.order.direction }, limit: e.limit ?? 10 } : {}),
      ...(e.columns ? { columns: e.columns } : {}),
      ...(e.of ? { of: e.of } : {}),
      ...(questionBasis(basis) ? { basis: questionBasis(basis)! } : {}),
      ...(pageSubjects !== 256 ? { pageSubjects } : {}),
    };
    setResultPage(0);
    setParams((p) => (p.set("ask", JSON.stringify({ ...q, basis: undefined })), p), { replace: true });
    void go(q, { fresh: true, wantRows: PAGE });
  }

  if (tools.isSuccess && !tools.has("ask_across_subjects"))
    return <NotInCatalogue tool="ask_across_subjects" what="Asking across subjects" />;

  const update = (key: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const shownRows = run?.rows.slice(resultPage * PAGE, (resultPage + 1) * PAGE) ?? [];
  const haveNext = run ? run.rows.length > (resultPage + 1) * PAGE || !run.complete : false;
  const runColumns = run?.question.result === "top" && run.question.order ? [run.question.order.by] : (run?.question.columns ?? []);
  const h = run?.last?.holdsFor;
  const examples = examplesFor(account || "account-003");
  const kindPrefixes = new Set(kindList.map((k) => k.prefix));

  const columnsDef: ColumnDef<AskRow, unknown>[] = [
    {
      id: "entity",
      header: "Entity",
      cell: (c) => {
        const id = c.row.original.id;
        if (!h) return <Mono>{id}</Mono>;
        const link = entityLink(id, roster, h.position, h.validAt);
        return (
          <Link to={link.to} className="underline-offset-4 hover:underline" data-testid="row-link">
            {link.subject !== null && <span className="mr-2 tabular-nums">Subject {link.subject}</span>}
            <Mono>{id}</Mono>
          </Link>
        );
      },
    },
    ...runColumns.map(
      (a): ColumnDef<AskRow, unknown> => ({
        id: a,
        header: a,
        cell: (c) => <span className="font-mono text-xs break-all">{cellValue(c.row.original.columns[a])}</span>,
      }),
    ),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageTitle
        title="Ask across subjects"
        actions={<span className="text-muted-foreground text-sm">Exact answers, read subject by subject</span>}
      >
        One account, one kind of entity, up to eight conditions that must all hold. Every answer is the store's, at one
        position and one valid time, and says so.
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="space-y-2" data-testid="examples">
          <div className="text-muted-foreground text-xs font-medium">Examples from the product's own questions</div>
          {examples.map((e) => {
            const here = kindPrefixes.size === 0 || kindPrefixes.has(e.kind.prefix);
            return (
              <button
                key={e.id}
                type="button"
                disabled={!account || !here || run?.running}
                onClick={() => choose(e)}
                className={cn(
                  "hover:bg-accent w-full rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                )}
                data-testid={`example-${e.id}`}
                title={here ? e.note : `${account} has no ${e.kind.prefix} entities`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span>{e.title}</span>
                  <Badge variant="outline" className="shrink-0 font-normal">{e.product}</Badge>
                </div>
                <div className="text-muted-foreground mt-0.5 text-xs">{here ? e.note : `Not in ${account}.`}</div>
              </button>
            );
          })}
          <div className="rounded-md border border-dashed px-3 py-2 text-sm" data-testid="example-protected">
            <div className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground">Subjects by a protected value</span>
              <Badge variant="outline" className="shrink-0 font-normal">S12</Badge>
            </div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              Refused, always: the store never looks subjects up by a protected value, so this console never offers it.
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <Card className="gap-4 py-4">
            <CardContent className="space-y-4 px-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground w-14">Account</span>
                <Select value={account} onValueChange={(a) => { clear(); setAccount(a); setKindKey(""); setDrafts([]); setGroups([]); setColumns([]); setOf(""); }}>
                  <SelectTrigger size="sm" className="w-44" data-testid="account-picker"><SelectValue placeholder="Account" /></SelectTrigger>
                  <SelectContent>
                    {roster.map((r) => (
                      <SelectItem key={r.account} value={r.account}>{r.account}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground ml-2">Kind</span>
                <Select value={kindKey} onValueChange={(k) => { clear(); setKindKey(k); setDrafts([]); setGroups([]); setColumns([]); setOf(""); }}>
                  <SelectTrigger size="sm" className="min-w-72" data-testid="kind-picker">
                    <SelectValue placeholder={kinds.isPending ? "Reading the kinds..." : "Kind"} />
                  </SelectTrigger>
                  <SelectContent>
                    {kindList.map((k) => (
                      <SelectItem key={JSON.stringify([k.prefix, k.shape ?? ""])} value={JSON.stringify([k.prefix, k.shape ?? ""])}>
                        <span>{k.label}</span>
                        <span className="text-muted-foreground ml-2 font-mono text-xs">{k.shape ?? k.prefix}</span>
                        <span className="text-muted-foreground ml-2 text-xs tabular-nums">{n(k.ids)}{k.countExact ? "" : "+"} IDs</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {kinds.isFetching && <Spinner className="size-4" />}
                {kinds.isError && <span className="text-destructive text-xs">{(kinds.error as Error).message}</span>}
              </div>

              <WhenControls />

              <Separator />

              <div className="space-y-2" data-testid="conditions">
                <div className="text-muted-foreground text-sm">
                  {drafts.length ? "Where all of these hold" : groups.length ? "Every entity of the kind, where:" : "No conditions: every entity of the kind."}
                </div>
                {drafts.map((d) => (
                  <ConditionRow
                    key={d.key}
                    draft={d}
                    onChange={(patch) => update(d.key, patch)}
                    onRemove={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
                    attributes={{ filterable, notFilterable, byName }}
                    account={account}
                    kinds={kindList}
                    basis={questionBasis(basis)}
                  />
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={conditionsUsed >= 8 || !kindKey}
                    onClick={() => setDrafts((ds) => [...ds, blankDraft(filterable[0]?.attribute ?? "", kindOfFamily(filterable[0]?.valueTypes[0]))])}
                    data-testid="add-condition"
                  >
                    <PlusIcon /> Add condition {conditionsUsed ? `(${conditionsUsed} of 8)` : ""}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={conditionsUsed >= 7 || !kindKey}
                    onClick={() => setDrafts((ds) => [...ds, blankHas(kindList.find((k) => k.prefix !== prefix)?.prefix ?? "")])}
                    data-testid="add-has"
                    title="A condition on each entity's related entities (its tasks, its placements, its subject), one level"
                  >
                    <PlusIcon /> Has related entities where...
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={conditionsUsed >= 8 || groups.length >= 4 || !kindKey}
                    onClick={() => setGroups((gs) => [...gs, [blankDraft(filterable[0]?.attribute ?? "", kindOfFamily(filterable[0]?.valueTypes[0]))]])}
                    data-testid="add-group"
                  >
                    <PlusIcon /> Any of these groups {groups.length ? `(${groups.length} of 4)` : ""}
                  </Button>
                </div>
                {groups.length > 0 && (
                  <div className="space-y-2 rounded-md border p-2" data-testid="groups">
                    <div className="text-muted-foreground text-sm">{drafts.length ? "And at least one of these groups holds" : "At least one of these groups holds"}</div>
                    {groups.map((g, gi) => (
                      <div key={gi} className="space-y-2 rounded-md border border-dashed p-2" data-testid="group">
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>{gi === 0 ? "Group 1: all of these" : `or group ${gi + 1}: all of these`}</span>
                          <Button size="sm" variant="ghost" onClick={() => setGroups((gs) => gs.filter((_, i) => i !== gi))}>Remove group</Button>
                        </div>
                        {g.map((d) => (
                          <ConditionRow
                            key={d.key}
                            draft={d}
                            onChange={(patch) => setGroups((gs) => gs.map((x, i) => (i === gi ? x.map((y) => (y.key === d.key ? { ...y, ...patch } : y)) : x)))}
                            onRemove={() => setGroups((gs) => gs.map((x, i) => (i === gi ? x.filter((y) => y.key !== d.key) : x)).filter((x) => x.length))}
                            attributes={{ filterable, notFilterable, byName }}
                            account={account}
                            kinds={kindList}
                            basis={questionBasis(basis)}
                          />
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={conditionsUsed >= 8}
                          onClick={() => setGroups((gs) => gs.map((x, i) => (i === gi ? [...x, blankDraft(filterable[0]?.attribute ?? "", kindOfFamily(filterable[0]?.valueTypes[0]))] : x)))}
                        >
                          <PlusIcon /> Add to this group
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">Answer as</span>
                <ToggleGroup type="single" variant="outline" size="sm" value={result} onValueChange={(v) => v && setResult(v as ResultKind)} data-testid="result-kind">
                  <ToggleGroupItem value="list">A list</ToggleGroupItem>
                  <ToggleGroupItem value="count">A count</ToggleGroupItem>
                  <ToggleGroupItem value="countByValue">A count per value</ToggleGroupItem>
                  <ToggleGroupItem value="top" data-testid="result-top">Top N by</ToggleGroupItem>
                  <ToggleGroupItem value="sum" data-testid="result-sum">A sum</ToggleGroupItem>
                </ToggleGroup>
                {result === "top" && (
                  <span className="flex flex-wrap items-center gap-2" data-testid="top-controls">
                    <Input className="h-8 w-20 tabular-nums" inputMode="numeric" value={String(order.n)} onChange={(e) => setOrder((o) => ({ ...o, n: Math.max(1, Math.min(1000, Number(e.target.value.replace(/\D/g, "")) || 1)) }))} data-testid="top-n" title="N, at most 1,000" />
                    <span className="text-muted-foreground">by</span>
                    <AttributePicker value={order.by} filterable={filterable} notFilterable={notFilterable} onChange={(by) => setOrder((o) => ({ ...o, by, type: kindOfFamily(byName.get(by)?.valueTypes[0]) }))} testId="top-by" />
                    <Select value={order.type} onValueChange={(t) => setOrder((o) => ({ ...o, type: t as ValueKind }))}>
                      <SelectTrigger size="sm" className="w-28" title="The values' type; others count as no value"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VALUE_KINDS.filter((v) => ["text", "integer", "number", "date"].includes(v.kind)).map((v) => <SelectItem key={v.kind} value={v.kind}>{v.words}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={order.direction} onValueChange={(d) => setOrder((o) => ({ ...o, direction: d as "asc" | "desc" }))}>
                      <SelectTrigger size="sm" className="w-36" data-testid="top-direction"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">highest first</SelectItem>
                        <SelectItem value="asc">lowest first</SelectItem>
                      </SelectContent>
                    </Select>
                  </span>
                )}
                {result === "sum" && (
                  <>
                    <span className="text-muted-foreground">of</span>
                    <AttributePicker value={of} filterable={filterable.filter((a) => a.valueTypes.includes("integer"))} notFilterable={notFilterable} onChange={setOf} testId="sum-of" />
                  </>
                )}
                {result === "list" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" data-testid="columns-picker">
                        Columns{columns.length ? ` (${columns.length})` : ""}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-80 overflow-y-auto">
                      <DropdownMenuLabel>Up to 8 attributes to show</DropdownMenuLabel>
                      {filterable.map((a) => (
                        <DropdownMenuCheckboxItem
                          key={a.attribute}
                          checked={columns.includes(a.attribute)}
                          disabled={!columns.includes(a.attribute) && columns.length >= 8}
                          onCheckedChange={(on) => setColumns((cs) => (on ? [...cs, a.attribute] : cs.filter((c) => c !== a.attribute)))}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <span className="font-mono text-xs">{a.attribute}</span>
                        </DropdownMenuCheckboxItem>
                      ))}
                      {notFilterable.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Protected, never listed</DropdownMenuLabel>
                          {notFilterable.map((a) => (
                            <DropdownMenuCheckboxItem key={a.attribute} disabled checked={false}>
                              <span className="font-mono text-xs">{a.attribute}</span>
                            </DropdownMenuCheckboxItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {result === "countByValue" && (
                  <>
                    <span className="text-muted-foreground">by</span>
                    <AttributePicker value={of} filterable={filterable} notFilterable={notFilterable} onChange={setOf} testId="count-by" />
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => ask()} disabled={!question || run?.running} data-testid="ask">
                  Ask
                </Button>
                {run?.running && (
                  <Button variant="outline" onClick={stop} data-testid="stop">
                    <SquareIcon /> Stop
                  </Button>
                )}
                {run && !run.running && !run.complete && run.cursor && !run.error && (
                  <Button variant="outline" onClick={() => void go(run.question, { fresh: false, wantRows: (resultPage + 1) * PAGE })} data-testid="continue">
                    Continue from where it stopped
                  </Button>
                )}
                <Select value={String(pageSubjects)} onValueChange={(v) => setPageSubjects(Number(v))}>
                  <SelectTrigger size="sm" className="w-60" data-testid="page-subjects" title="How many subjects the store reads before it reports back; smaller pages show progress sooner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 4, 16, 64, 256, 1000, 10000].map((v) => (
                      <SelectItem key={v} value={String(v)}>{n(v)} {v === 1 ? "subject" : "subjects"} per store page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {problems.length > 0 && drafts.length > 0 && <span className="text-muted-foreground text-xs">{problems[0]}</span>}
                <span className="text-muted-foreground ml-auto text-xs">
                  {described.isFetching ? "Reading the attributes..." : described.data ? `Attributes seen on the first ${n(described.data.sampled)} ${kind?.label.toLowerCase() ?? "entities"}; any other name can be typed.` : ""}
                </span>
              </div>
            </CardContent>
          </Card>

          {!run && (
            <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm" data-testid="question-empty">
              Choose an example or build a question, then Ask.
            </div>
          )}

          {run && (
            <div className="space-y-3">
              <StatusLine run={run} />
              {run.error ? <QuestionRefusal error={run.error} /> : null}
              {run.last && (
                <AnswerLine answer={run.last} call={run.call} label="Last page at position" />
              )}

              {!(run.error && !run.last) && (run.question.result === "list" || (run.question.result === "top" && run.complete)) && (
                <div className="space-y-2">
                  {run.running && run.rows.length <= resultPage * PAGE ? (
                    <div className="space-y-2" data-testid="loading">
                      {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-7" />)}
                    </div>
                  ) : (
                    <DataTable
                      columns={columnsDef}
                      data={shownRows}
                      rowKey={(r) => r.id}
                      dense
                      empty={run.complete ? "No entity of this kind matches at this position and valid time." : "None found yet."}
                    />
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground tabular-nums" data-testid="list-range">
                      {run.rows.length
                        ? `${n(resultPage * PAGE + 1)} to ${n(resultPage * PAGE + shownRows.length)} of ${n(run.rows.length)}${run.complete ? "" : " found so far"}`
                        : run.complete ? "0 found" : ""}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={resultPage === 0} onClick={() => setResultPage((p) => p - 1)}>
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!haveNext || run.running || Boolean(run.error)}
                        data-testid="next-page"
                        onClick={() => {
                          const next = resultPage + 1;
                          setResultPage(next);
                          if (run.rows.length < (next + 1) * PAGE && !run.complete) void go(run.question, { fresh: false, wantRows: (next + 1) * PAGE });
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {run.question.result === "top" && !run.complete && run.last && (
                <div className="text-muted-foreground rounded-md border p-4 text-sm" data-testid="top-progress">
                  Reading every entity of the kind once; the top {n(run.question.limit ?? 10)} is known when the last page is read ({n(run.last.top?.kept ?? 0)} kept so far, in the store's page marker).
                </div>
              )}
              {run.question.result === "top" && run.complete && run.last?.top && (
                <div className="text-muted-foreground text-xs" data-testid="top-answer">
                  Top {n(run.question.limit ?? 10)} by <span className="font-mono">{run.last.top.order?.by}</span> ({run.last.top.order?.direction === "desc" ? "highest first" : "lowest first"}), after reading {n(run.examined)} entities once. {run.last.top.meaning}
                </div>
              )}
              {run.question.result === "sum" && run.last?.sum && (
                <div className="rounded-md border p-4" data-testid="sum-answer">
                  <div className="text-3xl font-semibold tabular-nums">{BigInt(run.last.sum.sum).toLocaleString()}</div>
                  <div className="text-muted-foreground text-sm">
                    {run.complete ? "Exact sum" : "Sum so far; not complete"} of <span className="font-mono">{run.last.sum.of}</span>: {n(run.last.sum.valuesAdded)} values on {n(run.last.sum.subjectsWithValue)} entities
                    {run.last.sum.skipped ? `, ${n(run.last.sum.skipped)} values of another type skipped` : ""}.
                    {run.complete && run.last.sum.average ? ` Average ${run.last.sum.average.decimal} (exactly ${run.last.sum.average.numerator}/${run.last.sum.average.denominator}).` : ""}
                  </div>
                </div>
              )}
              {run.question.result === "count" && run.last && (
                <div className="rounded-md border p-4" data-testid="count-answer">
                  <div className="text-3xl font-semibold tabular-nums">{n(run.last.count ?? 0)}</div>
                  <div className="text-muted-foreground text-sm">
                    {run.complete ? "subjects match, exactly." : "subjects match so far; the count is not complete."}
                  </div>
                </div>
              )}

              {run.question.result === "countByValue" && run.last && (
                <GroupsTable groups={run.last.groups ?? []} complete={run.complete} of={run.question.of ?? ""} />
              )}

              {!(run.error && !run.last) && <HowAnswered run={run} {...(kind ? { kind } : {})} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AttributePicker({
  value,
  filterable,
  notFilterable,
  onChange,
  testId = "condition-attribute",
}: {
  value: string;
  filterable: AttributeRow[];
  notFilterable: AttributeRow[];
  onChange: (a: string) => void;
  testId?: string;
}) {
  const known = filterable.some((a) => a.attribute === value);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  // A name typed by hand, or one the attribute sample has not seen (or a protected one), is shown as typed.
  const asTyped = typing || (value !== "" && !known && (filterable.length > 0 || notFilterable.length > 0));
  if (asTyped)
    return (
      <div className="flex items-center gap-1">
        <Input
          className="h-8 w-56 font-mono text-xs"
          placeholder=":namespace/name"
          value={text}
          onChange={(e) => setText(e.target.value.trim())}
          onBlur={() => onChange(text)}
          onKeyDown={(e) => e.key === "Enter" && onChange(text)}
          data-testid={`${testId}-typed`}
        />
        <Button size="sm" variant="ghost" onClick={() => { setTyping(false); setText(""); }}>
          List
        </Button>
      </div>
    );
  return (
    <Select value={known ? value : ""} onValueChange={(a) => (a === "__type__" ? setTyping(true) : onChange(a))}>
      <SelectTrigger size="sm" className="w-64 font-mono text-xs" data-testid={testId}>
        <SelectValue placeholder="Attribute" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {filterable.map((a) => (
            <SelectItem key={a.attribute} value={a.attribute}>
              <span className="font-mono text-xs">{a.attribute}</span>
              <span className="text-muted-foreground ml-2 text-xs">{a.valueTypeWords.join(", ")}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        {notFilterable.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-xs">Not filterable</SelectLabel>
              {notFilterable.map((a) => (
                <SelectItem key={a.attribute} value={a.attribute} disabled data-testid="protected-attribute">
                  <span className="font-mono text-xs">{a.attribute}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{a.reason ?? "not filterable"}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}
        <SelectSeparator />
        <SelectItem value="__type__">Type another attribute...</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ValueInputs({ draft: d, onChange }: { draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  const inputType = d.type === "date" ? "datetime-local" : "text";
  const one = (value: string, set: (v: string) => void, placeholder: string, testId: string) =>
    d.type === "boolean" ? (
      <Select value={value} onValueChange={set}>
        <SelectTrigger size="sm" className="w-24" data-testid={testId}><SelectValue placeholder="yes/no" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">yes</SelectItem>
          <SelectItem value="false">no</SelectItem>
        </SelectContent>
      </Select>
    ) : (
      <Input
        type={inputType}
        className={cn("h-8", d.type === "date" ? "w-52" : "w-48", d.type === "reference" && "font-mono text-xs")}
        placeholder={placeholder}
        value={value}
        onChange={(e) => set(e.target.value)}
        data-testid={testId}
      />
    );
  switch (d.op) {
    case "eq":
    case "ne":
      return one(d.value, (v) => onChange({ value: v }), d.type === "reference" ? "acct/account-003/pl:00000007" : "value", "condition-value");
    case "contains":
      return (
        <span className="flex items-center gap-2">
          <Input className="h-8 w-48" placeholder="contains" value={d.value} onChange={(e) => onChange({ value: e.target.value })} data-testid="condition-value" />
          <label className="text-muted-foreground flex items-center gap-1 text-xs" title="Lower-case both before comparing">
            <Checkbox checked={d.caseInsensitive} onCheckedChange={(v) => onChange({ caseInsensitive: v === true })} data-testid="condition-any-case" /> any case
          </label>
        </span>
      );
    case "prefix":
      return one(d.value, (v) => onChange({ value: v }), "starts with", "condition-value");
    case "in":
      return (
        <Input className="h-8 w-64" placeholder="values, separated by commas" value={d.values} onChange={(e) => onChange({ values: e.target.value })} data-testid="condition-values" />
      );
    case "range":
      return (
        <span className="flex flex-wrap items-center gap-1">
          {one(d.from, (v) => onChange({ from: v }), "from", "condition-from")}
          <label className="text-muted-foreground flex items-center gap-1 text-xs">
            <Checkbox checked={d.fromExclusive} onCheckedChange={(v) => onChange({ fromExclusive: v === true })} /> above
          </label>
          <span className="text-muted-foreground text-xs">and</span>
          {one(d.to, (v) => onChange({ to: v }), "to", "condition-to")}
          <label className="text-muted-foreground flex items-center gap-1 text-xs">
            <Checkbox checked={d.toExclusive} onCheckedChange={(v) => onChange({ toExclusive: v === true })} /> below
          </label>
        </span>
      );
    default:
      return null;
  }
}

function GroupsTable({ groups, complete, of }: { groups: AskAnswer["groups"] & object; complete: boolean; of: string }) {
  const max = Math.max(1, ...groups.map((g) => g.subjects));
  const sorted = [...groups].sort((a, b) => b.subjects - a.subjects);
  return (
    <div className="space-y-2" data-testid="groups-answer">
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium"><span className="font-mono text-xs">{of}</span></th>
              <th className="px-3 py-2 text-right font-medium">Subjects</th>
              <th className="w-1/2 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-1.5 font-mono text-xs">{g.value === null ? <span className="text-muted-foreground font-sans">no value</span> : String(g.value)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{n(g.subjects)}</td>
                <td className="px-3 py-1.5">
                  <div className="bg-primary/70 h-2 rounded-sm" style={{ width: `${(100 * g.subjects) / max}%` }} />
                </td>
              </tr>
            ))}
            {!sorted.length && (
              <tr>
                <td colSpan={3} className="text-muted-foreground px-3 py-4 text-center">No subjects yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-muted-foreground text-xs">
        {complete ? "Exact counts." : "Counts so far; not complete."} A subject with no value counts under "no value"; a subject with two values counts under both.
      </div>
    </div>
  );
}

type AttributeLists = { filterable: AttributeRow[]; notFilterable: AttributeRow[]; byName: Map<string, AttributeRow> };

/** [DX-XQ9] One condition: a plain one (attribute, op, value), or "has related entities where" (one level). */
function ConditionRow({
  draft: d,
  onChange,
  onRemove,
  attributes,
  account,
  kinds,
  basis,
  nested = false,
}: {
  draft: Draft;
  onChange: (p: Partial<Draft>) => void;
  onRemove: () => void;
  attributes: AttributeLists;
  account: string;
  kinds: KindRow[];
  basis: Basis | undefined;
  nested?: boolean;
}) {
  if (d.op === "has") return <HasEditor draft={d} onChange={onChange} onRemove={onRemove} subjectAttributes={attributes} account={account} kinds={kinds} basis={basis} />;
  const a = attributes.byName.get(d.attribute);
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid={nested ? "related-condition" : "condition"}>
      <AttributePicker
        value={d.attribute}
        filterable={attributes.filterable}
        notFilterable={attributes.notFilterable}
        onChange={(attribute) => onChange({ attribute, type: kindOfFamily(attributes.byName.get(attribute)?.valueTypes[0]) })}
        {...(nested ? { testId: "related-attribute" } : {})}
      />
      <Select value={d.op} onValueChange={(op) => onChange({ op: op as Op })}>
        <SelectTrigger size="sm" className="w-36" data-testid="condition-op"><SelectValue /></SelectTrigger>
        <SelectContent>
          {OPS.map((o) => <SelectItem key={o.op} value={o.op}>{o.words}</SelectItem>)}
        </SelectContent>
      </Select>
      <ValueInputs draft={d} onChange={onChange} />
      {!["exists", "missing", "contains"].includes(d.op) && (
        <Select value={d.type} onValueChange={(t) => onChange({ type: t as ValueKind })}>
          <SelectTrigger size="sm" className="w-32" title="The values' type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {VALUE_KINDS.map((v) => <SelectItem key={v.kind} value={v.kind}>{v.words}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Button size="icon" variant="ghost" className="size-8" onClick={onRemove} aria-label="Remove condition">
        <XIcon />
      </Button>
      {d.op === "ne" && <span className="text-muted-foreground text-xs">no value counts as not</span>}
      {a?.examples.length ? (
        <span className="text-muted-foreground max-w-80 truncate text-xs" title={a.examples.join(", ")}>
          e.g. {a.examples.slice(0, 3).join(", ")}
        </span>
      ) : null}
    </div>
  );
}

const QUANTIFIERS: { q: Quantifier; words: string }[] = [
  { q: "some", words: "at least one" },
  { q: "none", words: "none" },
  { q: "gte", words: "at least N" },
  { q: "lte", words: "at most N" },
  { q: "eq", words: "exactly N" },
];

/** [DX-XQ9] "Has related entities of kind K (tied by the ID's number or by a reference) where ...", one level. */
function HasEditor({
  draft: d,
  onChange,
  onRemove,
  subjectAttributes,
  account,
  kinds,
  basis,
}: {
  draft: Draft;
  onChange: (p: Partial<Draft>) => void;
  onRemove: () => void;
  subjectAttributes: AttributeLists;
  account: string;
  kinds: KindRow[];
  basis: Basis | undefined;
}) {
  const tools = useTools();
  const described = useTool<DescribeAnswer>(
    "describe_kind",
    { account, prefix: d.related.prefix, ...(d.related.shape ? { shape: d.related.shape } : {}), basis, sample: 50 },
    { enabled: Boolean(account && d.related.prefix) && tools.has("describe_kind"), keepPrevious: true },
  );
  const attrs = described.data?.attributes ?? [];
  const lists: AttributeLists = {
    filterable: attrs.filter((a) => a.filterable),
    notFilterable: attrs.filter((a) => !a.filterable),
    byName: new Map(attrs.map((a) => [a.attribute, a])),
  };
  const refs = subjectAttributes.filterable.filter((a) => a.valueTypes.includes("ref"));
  const related = (patch: Partial<Draft["related"]>) => onChange({ related: { ...d.related, ...patch } });
  const kindValue = JSON.stringify([d.related.prefix, d.related.shape]);
  const kindChoices = kinds.filter((k) => /^[A-Za-z0-9_.-]{1,64}:$/.test(k.prefix));
  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-2" data-testid="has-condition">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Has</span>
        <Select value={d.quantifier} onValueChange={(q) => onChange({ quantifier: q as Quantifier })}>
          <SelectTrigger size="sm" className="w-32" data-testid="has-quantifier"><SelectValue /></SelectTrigger>
          <SelectContent>{QUANTIFIERS.map((q) => <SelectItem key={q.q} value={q.q}>{q.words}</SelectItem>)}</SelectContent>
        </Select>
        {["gte", "lte", "eq"].includes(d.quantifier) && (
          <Input className="h-8 w-16 tabular-nums" inputMode="numeric" value={d.count} onChange={(e) => onChange({ count: e.target.value.replace(/\D/g, "") })} data-testid="has-count" />
        )}
        <Select value={kindValue} onValueChange={(v) => { const [prefix, shape] = JSON.parse(v) as [string, string]; related({ prefix, shape }); }}>
          <SelectTrigger size="sm" className="min-w-56" data-testid="has-kind"><SelectValue placeholder="related kind" /></SelectTrigger>
          <SelectContent>
            {kindChoices.map((k) => (
              <SelectItem key={JSON.stringify([k.prefix, k.shape ?? ""])} value={JSON.stringify([k.prefix, k.shape ?? ""])}>
                {k.label} <span className="text-muted-foreground ml-2 font-mono text-xs">{k.shape ?? k.prefix}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={d.related.link} onValueChange={(l) => related({ link: l as "key" | "ref" })}>
          <SelectTrigger size="sm" className="w-56" data-testid="has-link" title="How a related entity is tied to the entity asked about"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="key">with the same number in its ID</SelectItem>
            <SelectItem value="ref">through a reference</SelectItem>
          </SelectContent>
        </Select>
        {d.related.link === "ref" && (
          <AttributePicker value={d.related.ref} filterable={refs} notFilterable={subjectAttributes.notFilterable} onChange={(ref) => related({ ref })} testId="has-ref" />
        )}
        <Button size="icon" variant="ghost" className="ml-auto size-8" onClick={onRemove} aria-label="Remove condition"><XIcon /></Button>
      </div>
      <div className="space-y-2 pl-4">
        <div className="text-muted-foreground text-xs">
          {d.inner.length ? "where all of these hold on the related entity" : "with any facts (no conditions on the related entity)"}
          {described.isFetching ? " (reading its attributes...)" : ""}
        </div>
        {d.inner.map((x) => (
          <ConditionRow
            key={x.key}
            draft={x}
            nested
            onChange={(patch) => onChange({ inner: d.inner.map((y) => (y.key === x.key ? { ...y, ...patch } : y)) })}
            onRemove={() => onChange({ inner: d.inner.filter((y) => y.key !== x.key) })}
            attributes={lists}
            account={account}
            kinds={kinds}
            basis={basis}
          />
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={!d.related.prefix || d.inner.length >= 7}
          onClick={() => onChange({ inner: [...d.inner, blankDraft(lists.filterable[0]?.attribute ?? "", kindOfFamily(lists.filterable[0]?.valueTypes[0]))] })}
          data-testid="has-add-condition"
        >
          <PlusIcon /> Condition on the related entity
        </Button>
      </div>
    </div>
  );
}
