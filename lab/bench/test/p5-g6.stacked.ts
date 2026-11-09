/** EXP-P5 G6: stacked integration test. Run after RQ01 is merged and testkit rebuilt.
 * North star: P5 correctness at named P; scope/targets are lab/SCOPE.md, NORTH-STAR.md, TARGETS.md.
 * This qualifies memory sweep routing only; engine maintenance remains a live qualification gap.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { memoryComposition } from "../lib/memory.ts";
const testkitUrl = new URL("../../../packages/testkit/dist/index.js", import.meta.url).href;
const api: any = await import(testkitUrl);
if (!api.runRouteEquivalence)
  throw new Error("G6 requires EXP-RQ01 built testkit; this is a stacked commit");

function fixture() {
  const base = api.makeOfflineRouteFixture("xtdb");
  let comp = memoryComposition("xtdb", randomUUID()),
    history: any,
    ids = new Map<string, string>(),
    source: any[] = [];
  let assertionSequence = 0;
  const append = async (commit: any) => {
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
        const returned = new Set(result.rows.map((r) => r.id));
        const rows = source.filter((r) => returned.has(ids.get(r.id)!));
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
      comp = memoryComposition("xtdb", randomUUID());
      ids = new Map();
      assertionSequence = 0;
      for (const c of h.commits) await append(c);
      await base.reset(h);
    },
    append: async (c: any) => {
      await append(c);
      history = { ...history, commits: [...history.commits, c] };
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
