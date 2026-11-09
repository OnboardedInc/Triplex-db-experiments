/** EXP-P5 G6: stacked integration test. Run after RQ01 is merged and testkit rebuilt.
 * North star: P5 correctness at named P; scope/targets are lab/SCOPE.md, NORTH-STAR.md, TARGETS.md.
 * This qualifies memory sweep routing only; engine maintenance remains a live qualification gap.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { memoryComposition } from "../lib/memory.ts";
const testkitUrl =
  process.env["TX2_RQ01_HARNESS_URL"] ??
  new URL("../../../packages/testkit/dist/index.js", import.meta.url).href;
const api: any = await import(testkitUrl);
if (!api.runRouteEquivalence)
  throw new Error("G6 requires EXP-RQ01 built testkit; this is a stacked commit");

function fixture() {
  const base = api.makeOfflineRouteFixture("xtdb");
  let instant = 0;
  let comp = memoryComposition("xtdb", randomUUID(), 0, () => instant),
    history: any,
    ids = new Map<string, string>(),
    source: any[] = [];
  let assertionSequence = 0;
  const append = async (commit: any) => {
    instant = commit.instant;
    while ((await comp.currentPosition()) < commit.position - 1) {
      const r = await comp.transact([], {});
      assert.ok(r.ok);
    }
    // [EXP-P5-G6] Why: R31 includes assert/retract in one frame; pre-bind the memory owner's deterministic IDs and confirm its actual receipt below. Rejected: looking up IDs only after ACK (cannot name an in-frame retirement).
    for (const w of commit.writes)
      if (w.op === "assert")
        ids.set(w.row.id, `m${(++assertionSequence).toString(36).padStart(8, "0")}`);
    const operations = commit.writes.map((w: any) =>
      w.op === "retract"
        ? { op: "retract", id: ids.get(w.id) }
        : {
            op: "assert",
            entityId: w.row.entity_id,
            attribute: w.row.attribute,
            value: decode(w.row),
            validFrom: w.row.valid_from,
            ...(w.row.valid_to === null ? {} : { validTo: w.row.valid_to }),
          },
    );
    const result = await comp.transact(operations, {});
    assert.ok(result.ok);
    let index = 0;
    for (const w of commit.writes)
      if (w.op === "assert") assert.equal(result.value.triples[index++].id, ids.get(w.row.id));
  };
  const route = {
    id: "sweep-page",
    contract: "snapshot",
    retention: { kind: "complete", plan: () => [] },
    refusals: ["BasisNotAvailable"],
    force: () => {},
    eligible: (request: any, h: any) =>
      api.routeShape(request) === "P" && request.basis.recordedPosition <= api.routeHead(h),
    read: async (request: any) => {
      if (api.routeShape(request) !== "P")
        throw new api.RouteRefusal("BasisNotAvailable", "sweep supports P only");
      try {
        const roots = request.entityId
          ? [request.entityId]
          : ([...new Set(source.map((r) => r.entity_id))] as string[]);
        const result = await comp.sweepPage(roots, {
          position: request.basis.recordedPosition,
          validAt: request.basis.validAt,
        });
        const originals = new Map(source.map((r) => [ids.get(r.id), r]));
        const rows = result.rows
          .filter((r) => !request.entityId || r.entityId === request.entityId)
          .map((r: any) => {
            const original: any = originals.get(r.id);
            if (!original) throw new Error("unbound row ID");
            const packed: any = {
              value_string: null,
              value_number: null,
              value_boolean: null,
              value_datetime: null,
              value_json: null,
            };
            const col: any = {
              string: "value_string",
              ref: "value_string",
              integer: "value_string",
              number: "value_number",
              boolean: "value_boolean",
              datetime: "value_datetime",
              json: "value_json",
            };
            packed[col[r.value.type]] =
              r.value.type === "json"
                ? JSON.stringify(r.value.value)
                : r.value.type === "boolean"
                  ? Number(r.value.value)
                  : r.value.value;
            return {
              ...original,
              entity_id: r.entityId,
              attribute: r.attribute,
              value_type: r.value.type,
              ...packed,
              recorded_position: r.position,
              recorded_at: r.recordedAt,
              valid_from: r.validFrom,
              valid_to: r.validTo ?? null,
              retracted_position: r.retractedPosition ?? null,
              retracted_at: r.retractedAt ?? null,
            };
          });
        return {
          rows: api.snapshotRouteRows(rows, request, api.routeHead(history)),
          taken: "sweep-page",
          basis: request.basis,
        };
      } catch (e: any) {
        if (e?._tag === "BasisNotAvailable")
          throw new api.RouteRefusal("BasisNotAvailable", e.message);
        throw e;
      }
    },
  };
  return {
    ...base,
    routes: [...base.routes, route],
    reset: async (h: any) => {
      history = h;
      source = api.foldRouteHistory(h);
      comp = memoryComposition("xtdb", randomUUID(), 0, () => instant);
      ids = new Map();
      assertionSequence = 0;
      for (const c of h.commits) await append(c);
      await base.reset(h);
    },
    append: async (c: any) => {
      await append(c);
      history = {
        ...history,
        commits: [...history.commits, c],
        ...(history.attempts && c.receipt
          ? {
              attempts: [
                ...history.attempts,
                {
                  id: c.receipt.attemptId,
                  status: "committed",
                  position: c.position,
                  stagedAt: c.instant,
                  stagedOrder: Math.max(...history.attempts.map((a: any) => a.stagedOrder)) + 1,
                  decidedOrder: Math.max(...history.attempts.map((a: any) => a.decidedOrder)) + 1,
                },
              ],
            }
          : {}),
      };
      source = api.foldRouteHistory(history);
      await base.append(c);
    },
  };
}
function decode(r: any) {
  if (r.value_type === "number") return { type: "number", value: r.value_number };
  if (r.value_type === "boolean") return { type: "boolean", value: !!r.value_boolean };
  if (r.value_type === "json") return { type: "json", value: JSON.parse(r.value_json) };
  return { type: r.value_type, value: r.value_string };
}
for (const seed of [1, 42, 890])
  test(`G6 memory sweep P families seed ${seed}`, async () => {
    const h = api.generateRouteHistory(seed);
    const requests = api
      .generateRouteBases(h)
      .filter((r: any) => ["P", "T", "TP"].includes(api.routeShape(r)));
    const result = await api.runRouteEquivalence({
      fixture: fixture(),
      history: h,
      requests,
      scope: { shapes: ["P", "T", "TP"] },
    });
    assert.deepEqual(result.violations, []);
  });

for (const mutation of ["wrong-value", "fail-open"])
  test(`G6 rejects sweep ${mutation}`, async () => {
    const original = fixture(),
      routes = original.routes.map((route: any) =>
        route.id !== "sweep-page"
          ? route
          : {
              ...route,
              read: async (request: any) => {
                const answer = await route.read(request);
                if (mutation === "fail-open") return { ...answer, eligible: false, rows: [] };
                return {
                  ...answer,
                  rows: answer.rows.map((row: any, i: number) =>
                    i === 0 ? { ...row, value_string: "changed-observed-value" } : row,
                  ),
                };
              },
            },
      );
    const history = api.generateRouteHistory(42);
    const result = await api.runRouteEquivalence({
      fixture: { ...original, routes },
      history,
      requests: api.generateRouteBases(history).filter((r: any) => api.routeShape(r) === "P"),
      scope: { shapes: ["P"] },
    });
    assert.ok(
      result.violations.some(
        (v: any) =>
          v.route === "sweep-page" && v.rule === (mutation === "fail-open" ? "HE-6" : "HE-1"),
      ),
    );
  });
