// [EXP-QNODELAY] Why: validate exact path bytes, payload schema and one run mode
// before any distribution is computed. Rejected: enum-only object parsing and
// caller-side preflights that can validate different bytes from the aggregator.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import type { QleverConnectionMode } from "./latency.mjs";
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonRecord = { [key: string]: Json };
declare const checkedMilliseconds: unique symbol;
export type Milliseconds = number & { readonly [checkedMilliseconds]: true };
export interface Timing {
  readonly field: string;
  readonly milliseconds: Milliseconds;
}
export interface LatencyRun {
  readonly receiptVersion: "qlever-latency/1";
  readonly writer: LatencyWriter;
  readonly units: "ms";
  readonly transportMode: QleverConnectionMode | null;
  readonly source: { readonly path: string; readonly sha256: string };
  readonly records: readonly JsonRecord[];
  readonly data: Json;
  readonly timings: readonly Timing[];
}
export interface ModeTreatment {
  readonly variedTreatment: "connection-mode";
  readonly populations: Readonly<Partial<Record<QleverConnectionMode, LatencyRun>>>;
}
export type RefusalCode =
  | "IO"
  | "JSON"
  | "VERSION"
  | "WRITER"
  | "UNITS"
  | "TIMING"
  | "MODE"
  | "MIXED_MODE";
export class LatencyRefusal extends Error {
  readonly _tag = "LatencyRefusal";
  readonly code: RefusalCode;
  readonly path: string;
  constructor(code: RefusalCode, path: string, detail: string) {
    super(`${path}: ${code}: ${detail}`);
    this.name = "LatencyRefusal";
    this.code = code;
    this.path = path;
  }
}
export type ReadResult<T> =
  | { readonly ok: true; readonly run: T; unwrap(): T }
  | { readonly ok: false; readonly refusal: LatencyRefusal; unwrap(): never };
export interface ReadOptions {
  readonly lane?: string;
  readonly encoding?: "json" | "ndjson";
  readonly ref?: string;
  readonly entry?: number;
  readonly expectedWriter?: string;
  readonly expectedMode?: QleverConnectionMode | null;
  readonly variedTreatment?: "connection-mode";
}
const mode = (v: unknown): v is QleverConnectionMode => v === "keep-alive" || v === "per-request";
const object = (v: unknown): v is JsonRecord => !!v && typeof v === "object" && !Array.isArray(v);
const reports = new Set([
  "tx2-ns-report/2",
  "triplex-db-2/p5-screening/1",
  "tx2-gate-receipt/1",
  "tx2-lab-conformance/1",
  "triplex-public-workload-packet/3",
  "triplex-public-load-run/1",
  "tx2-gs-run/2",
  "triplex-entity-scale-load/2",
  "triplex-public-pilot/2",
  "triplex-public-foundation/1",
  "j01-raw/2",
  "qg1-f05/1",
  "qg1-cell-summary/1",
  "triplex-qlever-cancel-restart/1",
  "triplex-independent-load-observation-rehash/1",
] as const);
const special = new Set([
  "qg1-cell/1",
  "qg1-p4/1",
  "qg1-request/1",
  "qg1-sample/1",
  "triplex-public-load-event/1",
  "ns-write-event/1",
  "c8-round-timing/1",
  "qlever-server-log/1",
  "qlever-profile/1",
] as const);
type SetItem<T> = T extends Set<infer V> ? V : never;
export type LatencyWriter = SetItem<typeof reports> | SetItem<typeof special>;
export function readLatencyRun(
  file: string,
  options: ReadOptions & { variedTreatment: "connection-mode" },
): ReadResult<ModeTreatment>;
export function readLatencyRun(
  file: string,
  options?: Omit<ReadOptions, "variedTreatment"> & { readonly variedTreatment?: never },
): ReadResult<LatencyRun>;
export function readLatencyRun(
  file: string,
  options: ReadOptions,
): ReadResult<LatencyRun | ModeTreatment>;
export function readLatencyRun(
  file: string,
  options: ReadOptions = {},
): ReadResult<LatencyRun | ModeTreatment> {
  const refuse = (code: RefusalCode, detail: string): never => {
    throw new LatencyRefusal(code, file, detail);
  };
  try {
    if (options.variedTreatment !== undefined && options.variedTreatment !== "connection-mode")
      refuse("MODE", "unknown varied treatment");
    let bytes: Buffer;
    try {
      bytes = options.ref
        ? execFileSync("git", ["show", `${options.ref}:${file}`], { maxBuffer: 128 * 1024 ** 2 })
        : fs.readFileSync(file);
    } catch (e) {
      return refuse("IO", String(e));
    }
    let data: unknown;
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      data =
        options.encoding === "ndjson" || (!options.encoding && /\.(?:ndjson|jsonl)$/.test(file))
          ? text
              .split("\n")
              .filter((s) => s.trim())
              .map((s) => JSON.parse(s))
          : JSON.parse(text);
    } catch (e) {
      return refuse("JSON", String(e));
    }
    const rows = Array.isArray(data) ? data : [data];
    if (!rows.length) refuse("TIMING", "empty run");
    const observations = new Map<
      QleverConnectionMode | null,
      { rows: JsonRecord[]; timings: Timing[]; rowTimings: Timing[][] }
    >();
    let writer: string | undefined;
    const numeric = (v: unknown, field: string, into: Timing[]): Milliseconds => {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
        return refuse("TIMING", `${field} must be finite nonnegative milliseconds`);
      const milliseconds = v as Milliseconds;
      into.push({ field, milliseconds });
      return milliseconds;
    };
    const generic = (v: Json, field: string, into: Timing[], timing = false): void => {
      if (Array.isArray(v)) {
        v.forEach((x, i) => generic(x, `${field}[${i}]`, into, timing));
        return;
      }
      if (object(v)) {
        for (const [key, child] of Object.entries(v)) {
          if (["n", "count", "observations"].includes(key)) continue;
          if (
            key === "qleverConnectionMode" ||
            key === "units" ||
            key === "latencyWriter" ||
            key === "receiptVersion"
          )
            continue;
          generic(
            child,
            `${field}.${key}`,
            into,
            timing ||
              /(?:Ms|Milliseconds)$/.test(key) ||
              /^(?:ms|p50|p90|p95|p99|maxMs|sumMs)$/.test(key),
          );
        }
      } else if (timing && v !== null) numeric(v, field, into);
    };
    const schema = (row: JsonRecord, id: string, into: Timing[]): void => {
      const at = (name: string) => numeric(row[name], name, into);
      if (id === "qg1-sample/1" || id === "qg1-request/1") {
        at("ms");
        return;
      }
      if (id === "qg1-p4/1") {
        if (!object(row["summary"]) || !Array.isArray(row["sample"]) || !row["sample"].length)
          refuse("TIMING", "P4 needs summary and samples");
        const summary = row["summary"] as JsonRecord;
        numeric(summary["p50"], "summary.p50", into);
        numeric(summary["p99"], "summary.p99", into);
        for (const [i, sample] of (row["sample"] as Json[]).entries()) {
          if (!object(sample)) refuse("TIMING", "invalid P4 sample");
          numeric((sample as JsonRecord)["ms"], `sample[${i}].ms`, into);
        }
        return;
      }
      if (id === "qg1-cell/1") {
        if (!object(row["results"]) || !Object.keys(row["results"]).length)
          refuse("TIMING", "grid cell requires query samples");
        for (const [query, samples] of Object.entries(row["results"] as JsonRecord)) {
          if (!Array.isArray(samples) || samples.length !== 2)
            refuse("TIMING", `${query} requires cold and warm samples`);
          for (const [i, sample] of (samples as Json[]).entries()) {
            if (!object(sample)) refuse("TIMING", "invalid grid sample");
            const s = sample as JsonRecord;
            if (
              s["receiptVersion"] !== "qlever-latency/1" ||
              s["latencyWriter"] !== "qg1-sample/1" ||
              s["units"] !== "ms"
            )
              refuse("WRITER", "unrecognized grid sample schema");
            if (
              !Object.hasOwn(s, "qleverConnectionMode") ||
              s["qleverConnectionMode"] !== row["qleverConnectionMode"]
            )
              refuse("MIXED_MODE", "grid sample mode must match its run");
            numeric(s["ms"], `results.${query}[${i}].ms`, into);
          }
        }
        return;
      }
      if (id === "triplex-public-load-event/1") {
        if (row["type"] === "read") {
          const start = at("startedMs"),
            finish = at("finishedMs");
          if (finish < start) refuse("TIMING", "read finished before start");
          if (row["dispatchedMs"] !== undefined) at("dispatchedMs");
        } else if (row["type"] === "write") {
          at("offeredMs");
          for (const key of ["ackMs", "visibleMs", "writeStartedMs", "visibilityProbeStartedMs"])
            if (row[key] !== undefined && row[key] !== null) at(key);
        } else refuse("TIMING", "unknown load event type");
        return;
      }
      if (id === "ns-write-event/1") {
        at("latencyMs");
        at("offsetMs");
        return;
      }
      if (id === "qlever-server-log/1") {
        if (typeof row["log"] !== "string") refuse("TIMING", "log text required");
        for (const match of (row["log"] as string).matchAll(
          /(?:total time was |Query planning done in )([\d,]+) ms/g,
        ))
          numeric(Number(match[1]!.replaceAll(",", "")), "log.ms", into);
        return;
      }
      if (id === "qlever-profile/1") {
        numeric(row["time"], "time", into);
        if (!object(row["runtimeInformation"])) refuse("TIMING", "execution tree required");
        const tree = (v: Json | undefined): void => {
          if (!object(v)) refuse("TIMING", "execution node required");
          const node = v as JsonRecord;
          numeric(node["operation_time"], "operation_time", into);
          numeric(node["total_time"], "total_time", into);
          if (Array.isArray(node["children"])) node["children"].forEach(tree);
        };
        tree((row["runtimeInformation"] as JsonRecord)["query_execution_tree"]);
        return;
      }
      if (id === "c8-round-timing/1") {
        if (!object(row["graphs"])) refuse("TIMING", "graphs required");
        for (const [name, graph] of Object.entries(row["graphs"] as JsonRecord)) {
          if (!object(graph) || !Array.isArray(graph["native"]) || !Array.isArray(graph["datalog"]))
            refuse("TIMING", "native/datalog samples required");
          for (const call of (graph as JsonRecord)["native"] as Json[])
            if (object(call) && call["steps"] !== undefined) {
              numeric(call["totalMs"], `${name}.totalMs`, into);
              if (!Array.isArray(call["steps"])) refuse("TIMING", "steps array required");
              for (const step of call["steps"] as Json[]) {
                if (!Array.isArray(step)) refuse("TIMING", "step pair required");
                numeric((step as Json[])[1], `${name}.step`, into);
              }
            }
          for (const call of (graph as JsonRecord)["datalog"] as Json[])
            numeric(object(call) ? call["ms"] : call, `${name}.datalog`, into);
        }
        if (!into.length) refuse("TIMING", "C8 timings missing");
        return;
      }
      if (id === "j01-raw/2") {
        if (!Array.isArray(row["raw"]) && !object(row["raw"]))
          refuse("TIMING", "raw payload required");
        generic(row, "$", into);
        return;
      }
      generic(row, "$", into);
      if (!into.length) refuse("TIMING", "registered report has no timing payload");
    };
    for (const value of rows) {
      if (!object(value)) refuse("JSON", "receipt object required");
      const row = value as JsonRecord;
      if (row["receiptVersion"] !== "qlever-latency/1")
        refuse("VERSION", "expected qlever-latency/1");
      const id = row["latencyWriter"];
      if (
        typeof id !== "string" ||
        (!(special as Set<string>).has(id) && !(reports as Set<string>).has(id)) ||
        (options.expectedWriter && options.expectedWriter !== id)
      )
        refuse("WRITER", "unregistered or unexpected writer");
      if (writer !== undefined && writer !== id) refuse("WRITER", "multiple writers in a run");
      writer = id as string;
      if (row["format"] !== undefined && row["format"] !== id)
        refuse("VERSION", "format disagrees with registered writer schema");
      if (row["units"] !== "ms") refuse("UNITS", "timing units must be ms");
      const selected = row["qleverConnectionMode"];
      const lane = options.lane ?? row["lane"] ?? row["backend"] ?? row["queryPath"];
      const identifiesQlever = [row["lane"], row["backend"], row["queryPath"]].some(
        (v) => typeof v === "string" && v.startsWith("qlever"),
      );
      const qleverWriter =
        (id as string).startsWith("qg1-") ||
        (id as string).startsWith("qlever-") ||
        (id as string).includes("qlever-cancel");
      const nonQ =
        !identifiesQlever &&
        !qleverWriter &&
        typeof lane === "string" &&
        /^(xtdb|duckdb|datomic|memory)(?:$|-)/.test(lane);
      if (
        !Object.hasOwn(row, "qleverConnectionMode") ||
        !(mode(selected) || (nonQ && selected === null))
      )
        refuse("MODE", "missing or invalid transport mode");
      if (options.expectedMode !== undefined && selected !== options.expectedMode)
        refuse("MIXED_MODE", "receipt mode differs from its parent run");
      const timings: Timing[] = [];
      schema(row, id as string, timings);
      const modes = (v: Json): void => {
        if (Array.isArray(v)) {
          v.forEach(modes);
          return;
        }
        if (!object(v)) return;
        if (Object.hasOwn(v, "qleverConnectionMode") && v["qleverConnectionMode"] !== selected)
          refuse("MIXED_MODE", "conflicting nested transport mode");
        Object.values(v).forEach(modes);
      };
      modes(row);
      const key = selected as QleverConnectionMode | null;
      const bucket = observations.get(key) ?? { rows: [], timings: [], rowTimings: [] };
      bucket.rows.push(row);
      bucket.timings.push(...timings);
      bucket.rowTimings.push(timings);
      observations.set(key, bucket);
    }
    if (observations.size > 1 && !options.variedTreatment)
      refuse(
        "MIXED_MODE",
        "declare connection-mode as the varied treatment; pooled runs are forbidden",
      );
    const source = { path: file, sha256: createHash("sha256").update(bytes).digest("hex") };
    const make = (
      transportMode: QleverConnectionMode | null,
      bucket: { rows: JsonRecord[]; timings: Timing[]; rowTimings: Timing[][] },
    ): LatencyRun => {
      const selected = options.entry === undefined ? bucket.rows : [bucket.rows[options.entry]];
      if (selected.some((x) => !x)) refuse("JSON", "receipt entry missing");
      const run: LatencyRun = {
        receiptVersion: "qlever-latency/1",
        writer: writer! as LatencyWriter,
        units: "ms",
        transportMode,
        source,
        records: selected as JsonRecord[],
        data:
          options.entry !== undefined || !Array.isArray(data)
            ? selected[0]!
            : (selected as JsonRecord[]),
        timings: options.entry === undefined ? bucket.timings : bucket.rowTimings[options.entry]!,
      };
      return run;
    };
    const run = options.variedTreatment
      ? {
          variedTreatment: "connection-mode" as const,
          populations: Object.fromEntries(
            [...observations].map(([m, b]) => {
              if (!m) refuse("MODE", "treatment requires QLever modes");
              return [m, make(m, b)];
            }),
          ),
        }
      : make(...[...observations][0]!);
    return { ok: true, run, unwrap: () => run };
  } catch (e) {
    const refusal = e instanceof LatencyRefusal ? e : new LatencyRefusal("JSON", file, String(e));
    return {
      ok: false,
      refusal,
      unwrap: () => {
        throw refusal;
      },
    };
  }
}
