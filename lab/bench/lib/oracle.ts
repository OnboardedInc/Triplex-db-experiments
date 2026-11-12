/**
 * Independent check of a seeded sample of reads against O-REPLAY (lab/oracles/replay, branch
 * exp/O01-replay-oracle; SCHEMA.md v1).
 *
 * The case holds the full intent of every command that touched a sampled subject's world (the
 * shared-account seed commands, the seed batches holding sample subjects, and every trace command of
 * a sample subject) with their receipts. Every other committed position is declared `internal`, so
 * positions stay dense (R-RCP-1) without shipping the whole run. Queries: `entityTriples` at
 * {position: latest, recordedAt: R, validAt: V} of every entity the observed pull returned or
 * referenced. A mismatch in any fact, a missing entity, or a missing ref shows up at the first level
 * where the observed world differs.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { requireOracleBinding } from "./oracle-output.ts";
import { oraclePublicValue } from "./oracle-public-value.ts";
import { memberOf } from "./world.ts";
import type { RecordedCommand } from "./seed.ts";

export interface OracleSampleRead {
  readonly subject: number;
  readonly basis: { recordedAt: number; validAt: number };
  readonly rows: [string, string, any, number | null, number | null, string][];
}

export function buildCase(opts: { caseId: string; commands: readonly RecordedCommand[]; lastPosition: number; reads: readonly OracleSampleRead[] }) {
  const byPosition = new Map<number, RecordedCommand>();
  for (const c of opts.commands) byPosition.set(c.receipt.position, c);
  const commands: any[] = [];
  const receipts: any[] = [];
  let lastInstant = 0;
  const knownAssertions = new Set<string>();
  for (let p = 1; p <= opts.lastPosition; p++) {
    const c = byPosition.get(p);
    const index = commands.length;
    if (!c) {
      commands.push({ kind: "internal", scope: "s1", expectedOutcome: "committed", journaled: true });
      receipts.push({ command: index, outcome: "committed", txId: `internal:${p}`, position: p, instant: lastInstant });
      continue;
    }
    // [DX-H3] Why: omitted seed/history parents make a sampled case incomplete, not an engine failure.
    // Rejected: deleting the unknown retract from the case or accepting the sampled worlds alone.
    for (const op of c.operations) if (op.op === "retract" && !knownAssertions.has(op.id)) throw Error(`Incomplete O-REPLAY input: assertion ${op.id} retracted at position ${p} was not recorded`);
    for (const id of c.receipt.assertionIds) if (id) knownAssertions.add(id);
    lastInstant = Math.max(lastInstant, c.receipt.instant);
    commands.push({
      kind: "transact",
      scope: "s1",
      operations: c.operations.map((op) =>
        op.op === "assert"
          ? { op: "assert", entityId: op.entityId, attribute: op.attribute, value: op.value, validFrom: op.validFrom, ...(op.validTo !== undefined ? { validTo: op.validTo } : {}) }
          : { op: "retract", id: op.id },
      ),
      meta: { commandId: c.commandId, ...(c.actor ? { actor: c.actor } : {}), ...(c.preconditions.length ? { preconditions: c.preconditions } : {}) },
    });
    receipts.push({ command: index, outcome: "committed", txId: c.receipt.txId, position: p, instant: c.receipt.instant, assertionIds: c.receipt.assertionIds });
  }
  const queries: any[] = [];
  opts.reads.forEach((read, k) => {
    const entities = new Set<string>();
    for (const [e, , v] of read.rows) {
      entities.add(e);
      if (v?.type === "ref") entities.add(v.value);
    }
    for (const e of [...entities].sort())
      queries.push({ id: `r${k}|${e}`, kind: "entityTriples", entityId: e, cut: { scope: "s1", position: "latest", recordedAt: read.basis.recordedAt, validAt: read.basis.validAt } });
  });
  return {
    format: "triplex-db-2/o-replay-case/1",
    caseId: opts.caseId,
    defaultScope: "s1",
    initialPositions: { s1: 0 },
    commands,
    receipts,
    queries,
  };
}

/** Run O-REPLAY on the case and compare each sampled read with the oracle's visible rows. */
export function checkWithOracle(opts: { oracleRoot: string; dir: string; caseDoc: any; reads: readonly OracleSampleRead[] }) {
  const caseFile = path.join(opts.dir, "oracle-case.json");
  const outFile = path.join(opts.dir, "oracle-expected.json");
  const caseText = JSON.stringify(opts.caseDoc);
  fs.writeFileSync(caseFile, caseText);
  fs.rmSync(outFile, { force: true });
  const cli = path.join(opts.oracleRoot, "lab/oracles/replay/cli.py");
  const started = Date.now();
  let exitCode = 0;
  try {
    const bridge = process.env["TX2_ORACLE_BRIDGE"];
    // [DX-H3] Why: keep the frozen Python oracle when the local VM image lacks Python.
    // Rejected: reimplementing its semantics in the harness or changing expected bytes.
    execFileSync(bridge ? process.execPath : "python3", [...(bridge ? [path.resolve("lab/experiments/EXP-DX1/h3/oracle-bridge.mjs"), "client", bridge] : []), "-I", cli, caseFile, "-o", outFile], { stdio: ["ignore", "ignore", "pipe"], maxBuffer: 64 << 20, timeout: 900_000 });
  } catch (error: any) {
    exitCode = error.status ?? -1;
    if (!fs.existsSync(outFile)) return { status: "ORACLE-ERROR", exitCode, stderr: String(error.stderr ?? error.message).slice(0, 2000), reads: 0, mismatches: [] as any[] };
  }
  const out = JSON.parse(fs.readFileSync(outFile, "utf8"));
  requireOracleBinding(out, caseText, opts.caseDoc);
  const expectedByRead = new Map<number, Map<string, Set<string>>>();
  for (const q of out.queries ?? []) {
    const [k, e] = String(q.id).split("|");
    const map = expectedByRead.get(Number(k.slice(1))) ?? new Map<string, Set<string>>();
    const rows = q.result?.raw ?? [];
    map.set(e!, new Set(rows.map((row: any) => memberOf(row.entityId, row.attribute, oraclePublicValue(row.value)))));
    expectedByRead.set(Number(k.slice(1)), map);
  }
  const mismatches: any[] = [];
  opts.reads.forEach((read, k) => {
    const expected = expectedByRead.get(k) ?? new Map();
    const observed = new Map<string, Set<string>>();
    for (const [e, a, v] of read.rows) {
      const set = observed.get(e) ?? new Set<string>();
      set.add(memberOf(e, a, v));
      observed.set(e, set);
    }
    for (const [e, exp] of expected) {
      const obs = observed.get(e) ?? new Set<string>();
      const missing = [...exp].filter((m) => !obs.has(m));
      const extra = [...obs].filter((m) => !exp.has(m));
      if (missing.length || extra.length)
        mismatches.push({ read: k, subject: read.subject, basis: read.basis, entityId: e, missing: missing.slice(0, 5), extra: extra.slice(0, 5) });
    }
  });
  return {
    status: mismatches.length === 0 && exitCode === 0 && out.verdict === "PASS" && out.receiptConsistency?.status === "PASS" ? "PASS" : "FAIL",
    oracleVerdict: out.verdict,
    divergedAtCommand: out.divergedAtCommand ?? null,
    receiptConsistency: out.receiptConsistency?.status ?? null,
    receiptViolations: (out.receiptConsistency?.violations ?? []).slice(0, 5),
    exitCode,
    reads: opts.reads.length,
    entityQueries: (out.queries ?? []).length,
    oracleMs: Date.now() - started,
    mismatches: mismatches.slice(0, 20),
    mismatchCount: mismatches.length,
  };
}
