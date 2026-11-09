// [CX-INT-Q] Why: accepted P2Q identifies transport outages by code, not prose. Rejected: weakening product classification for an old stub.
// [EXP-SQL01] Why: generated histories compare actual routes with an independent event-derived oracle.
// Rejected: deriving expected facts from recent_rows (both routes could share the same storage defect).
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { gzipSync } from "node:zlib";
import { Effect } from "effect";
import { it, expect } from "vitest";
import type { ResolvedTemporalBasis } from "@triplex-build/triplex";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import type { QleverClient } from "../../../packages/qlever/src/QleverClient.ts";
import { columns } from "../../../packages/qlever/src/rdf.ts";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.ts";
import { makeQleverStorageAdapter } from "../../../packages/qlever/src/QleverStorageAdapter.ts";

const evidence = (name: string, x: any) => {
  const prefix = path.join(import.meta.dirname, "evidence", `${process.env.SQL01_ATTEMPT ?? "qa2"}-${name}`);
  if (x.observations) {
    // [EXP-SQL01] Why: preserve every comparison without a million-line repeated JSON table.
    // Rejected: retaining only a zero-mismatch count (not independently inspectable).
    const archive = gzipSync(JSON.stringify(x.observations)); fs.writeFileSync(prefix + "-observations.json.gz", archive);
    x = { ...x, observations: undefined, observationArchive: path.basename(prefix) + "-observations.json.gz", observationArchiveSha256: createHash("sha256").update(archive).digest("hex"), observationCount: x.observations.length };
  }
  fs.writeFileSync(prefix + ".json", JSON.stringify(x, null, 2));
};
const canonical = (rs: readonly TripleRow[]) => JSON.stringify([...rs].sort((a,b) => a.id.localeCompare(b.id)).map(r => Object.fromEntries(Object.entries(r).sort(([a],[b]) => a.localeCompare(b)))));
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const client: QleverClient = { query: async () => { throw new TypeError("fetch failed", { cause: Object.assign(new Error("fixture connection refused"), { code: "ECONNREFUSED" }) }); }, update: async () => ({}), command: async () => ({}), cancel: async () => {}, close: async () => {} };
const blank = (id: string, entity: string, attr: string, value: string, recordedAt: number, from: number, to: number | null): TripleRow => ({ ...Object.fromEntries(columns.map(c => [c, null])), id, entity_id: entity, attribute: attr, value_type: "string", value_string: value, recorded_at: recordedAt, recorded_position: -1, valid_from: from, valid_to: to, entity_type: "Subject", schema_version: 1, tx_id: "tx/" + id }) as TripleRow;
const random = (seed: number) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const visible = (r: TripleRow, basis: ResolvedTemporalBasis | undefined, head: number) => {
  const p = basis?.recordedPosition ?? head;
  const asserted = r.recorded_position <= p && (basis?.recordedAt === undefined || r.recorded_at <= basis.recordedAt);
  const retracted = r.retracted_position !== null && r.retracted_at !== null && r.retracted_position <= p && (basis?.recordedAt === undefined || r.retracted_at <= basis.recordedAt);
  const valid = basis === undefined || (r.valid_from <= basis.validAt && (r.valid_to === null || basis.validAt < r.valid_to));
  return asserted && !retracted && valid;
};

it("generated histories preserve exact route equivalence for every temporal basis shape", async () => {
  const histories: any[] = [], observations: any[] = [], mismatches: any[] = [];
  const totals = { histories: 0, commits: 0, requests: 0, pairs: 0, h1Served: 0, naturalSource: 0, forcedSource: 0, cases: {} as Record<string, number> };
  try {
    for (let seed = 1; seed <= 12; seed++) {
      const rand = random(seed), dir = path.join(import.meta.dirname, "data", `qa2-routes-${seed}-${randomUUID()}`);
      let b = await HostBroker.open({ dir, scopeKey: "qa2-routes", minFreeBytes: 0 });
      const model = new Map<string, TripleRow>(), trace: any[] = [], positions: number[] = [], times: number[] = [];
      let serial = 0;
      try {
        for (let step = 0; step < 24; step++) {
          const at = 100 + Math.floor(step / 2) * 3;
          const active = [...model.values()].filter(r => r.retracted_position === null);
          const kind = step < 5 ? ["assert", "retract", "replace", "valid-edit", "many"][step]! : ["assert", "retract", "replace", "valid-edit", "many"][Math.floor(rand() * 5)]!;
          const priors = (kind === "retract" || kind === "replace" || kind === "valid-edit") && active.length ? [active[Math.floor(rand() * active.length)]!] : [];
          const rows: TripleRow[] = priors.map(r => ({ ...r, retracted_at: at, retracted_position: -1, retract_tx_id: `tx/${seed}/${step}` }));
          if (kind !== "retract" || !priors.length) {
            const n = kind === "many" || step === 0 ? 6 : kind === "replace" ? 3 : 1;
            for (let j = 0; j < n; j++) {
              const entity = priors[0]?.entity_id ?? (j % 4 === 3 ? "peer" : "hot");
              const from = kind === "valid-edit" ? [0, 10, 40, 400][j % 4]! : [0, 10, 100, 400][Math.floor(rand() * 4)]!;
              const to = kind === "valid-edit" ? (from < 100 ? 100 : 1000) : rand() < .35 ? from + 40 : null;
              rows.push(blank(`s${seed}/r${serial++}`, entity, kind === "many" || step === 0 ? ":many" : priors[0]?.attribute ?? ":value", `v${Math.floor(rand()*4)}`, at, from, to));
            }
          }
          const command = `seed-${seed}-step-${step}`;
          const d = await b.submit({ operationId: command, attemptId: command, sourceK: b.head(), reads: { entities: new Set(), scopeWide: false }, claims: [{ commandId: command, txId: command, timestamp: at }], placeholders: [-1], rows, priors: new Map(priors.map(r => [r.id, r])), newIds: new Set(rows.filter(r => !model.has(r.id)).map(r => r.id)) });
          expect(d.kind).toBe("committed");
          if (d.kind !== "committed") throw Error("unexpected conflict");
          const position = d.positions.get(-1)!;
          const final = rows.map(r => ({ ...r, recorded_position: r.recorded_position === -1 ? position : r.recorded_position, retracted_position: r.retracted_position === -1 ? position : r.retracted_position }));
          for (const r of final) model.set(r.id, r);
          trace.push({ step, kind, at, position, rows: final }); positions.push(position); times.push(at);
          totals.commits++; totals.cases[kind] = (totals.cases[kind] ?? 0) + 1;
        }
        const cuts: { shape: string; basis?: ResolvedTemporalBasis }[] = [{ shape: "latest" }];
        const ps = [0, positions[0]! - 1, positions[0]!, positions[7]!, positions[15]!, positions.at(-1)!];
        const ts = [0, times[0]! - 1, times[0]!, times[7]!, times[15]!, times.at(-1)! + 1];
        const vs = [0, 10, 39, 40, 99, 100, 140, 400, 500, 1000];
        for (const v of vs) cuts.push({ shape: "valid", basis: { validAt: v } });
        for (const p of ps) cuts.push({ shape: "position", basis: { validAt: 500, recordedPosition: p } });
        for (const t of ts) cuts.push({ shape: "record", basis: { validAt: 500, recordedAt: t } });
        for (const p of ps) for (const t of ts) cuts.push({ shape: "record+position", basis: { validAt: 500, recordedAt: t, recordedPosition: p } });
        for (const v of vs) for (const p of ps) cuts.push({ shape: "valid+position", basis: { validAt: v, recordedPosition: p } });
        for (const v of vs) for (const t of ts) cuts.push({ shape: "valid+record", basis: { validAt: v, recordedAt: t } });
        for (const v of vs) for (const p of ps) for (const t of ts) cuts.push({ shape: "valid+record+position", basis: { validAt: v, recordedAt: t, recordedPosition: p } });
        const history = { seed, dir, trace, cuts, finalModel: [...model.values()] }; histories.push(history); totals.histories++;
        for (const phase of ["before-purge", "after-purge", "reopened"]) {
          if (phase === "after-purge") b.purgeCurrent(b.head());
          if (phase === "reopened") { await b.close(); b = await HostBroker.open({ dir, scopeKey: "qa2-routes", minFreeBytes: 0 }); }
          let forced = false, pulls = 0, sourceReads = 0, eligible = false;
          const pull = b.pullAt.bind(b), source = b.fromLogAsync.bind(b);
          // [EXP-SQL01] Why: force only eligibility refusal, then execute the real complete-source fallback.
          // Rejected: returning oracle rows through a mocked source (would not compare actual storage routes).
          b.pullAt = async (...args) => { pulls++; const r = await pull(...args); eligible = r.eligible; return forced ? { ...r, eligible: false, rows: [] } : r; };
          b.fromLogAsync = async (...args) => { sourceReads++; return source(...args); };
          const adapter = makeQleverStorageAdapter(client, "qa2-routes", { broker: b });
          try {
            for (let i = 0; i < cuts.length; i++) for (const selection of ["entities", "many"]) {
              const c = cuts[i]!, expectedRows = [...model.values()].filter(r => (selection === "entities" ? r.entity_id === "hot" || r.entity_id === "peer" : r.entity_id === "hot" && r.attribute === ":many") && visible(r, c.basis, b.head()));
              const expected = canonical(expectedRows), answers: string[] = [];
              for (const arm of ["candidate", "forced-source"]) {
                forced = arm === "forced-source"; pulls = 0; sourceReads = 0; eligible = false;
                const actualRows = selection === "entities" ? [...(await Effect.runPromise(adapter.getByEntities(["hot", "peer", "absent"], c.basis))).values()].flat() : await Effect.runPromise(adapter.query({ entityId: "hot", attribute: ":many" }, c.basis));
                const actual = canonical(actualRows); answers.push(actual); totals.requests++;
                const route = pulls && eligible && !forced ? "h1" : "source";
                if (arm === "candidate") route === "h1" ? totals.h1Served++ : totals.naturalSource++; else totals.forcedSource++;
                const record = { seed, phase, cut: i, shape: c.shape, selection, arm, route, pulls, sourceReads, eligible, count: actualRows.length, actual: digest(actual), expected: digest(expected) };
                observations.push(record);
                if (actual !== expected || (route === "h1" && c.basis?.recordedAt !== undefined) || (arm === "forced-source" && sourceReads !== 1)) {
                  mismatches.push({ ...record, basis: c.basis, actualRows, expectedRows });
                  evidence("routes-first-failure", { histories, observations, mismatches, totals });
                  expect(actual, JSON.stringify(record)).toBe(expected);
                  expect(route === "h1" && c.basis?.recordedAt !== undefined).toBe(false);
                  expect(sourceReads).toBe(1);
                }
              }
              totals.pairs++; expect(answers[0]).toBe(answers[1]);
            }
          } finally { b.pullAt = pull; b.fromLogAsync = source; }
        }
      } finally { await b.close(); }
    }
    expect(totals.h1Served).toBeGreaterThan(0); expect(totals.naturalSource).toBeGreaterThan(0); expect(mismatches).toEqual([]);
  } finally { evidence("routes-generated", { totals, mismatches, histories, observations }); }
}, 180_000);
