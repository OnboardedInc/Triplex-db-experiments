import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { pageRoots } from "../../../bench/lib/w0-page-outbox.ts";
import { readOutboxAt } from "../../../bench/lib/w0-outbox-state.ts";
import { pageWireState } from "../../../bench/lib/w0-page-check.ts";
import { outboxEntity } from "../../../bench/lib/w0-outbox.ts";
import { W0, V_W0, canonical } from "../../../bench/lib/w0-world.ts";
import type { OutboxStore } from "../../../bench/lib/w0-outbox.ts";
import type { DomainOracle } from "../../../bench/lib/w0-gates.ts";

export const open = async (scope: string) =>
  process.env.DX_ACT1_NATIVE === "1"
    ? (await import("../../../bench/lib/composition.ts")).openComposition("reach", "datomic", scope)
    : process.env.DX_ACT1_SQLITE_DIR
      ? (await import("./sqlite.ts")).sqliteStore(process.env.DX_ACT1_SQLITE_DIR, scope)
      : memoryComposition("datomic", scope);

export async function observe(
  comp: OutboxStore,
  subjects: string[],
  position: number,
  layout?: string,
) {
  if (layout === "page-cut") {
    const page = await readOutboxAt(comp, pageRoots(subjects), position);
    return subjects.map((id) => JSON.parse(canonical(pageWireState(page.rows, id))));
  }
  const page = await comp.sweepPage(subjects.map(outboxEntity), { position, validAt: V_W0 });
  assert.deepEqual(page.reportedBasis, { position, validAt: V_W0 });
  // [DX-ACT1] Why: decode the durable layout independently of the publisher's decoder. Rejected: reading its returned state or trusting its changed counter.
  return subjects.map((subject) => {
    const rows = page.rows.filter((r) => r.entityId === outboxEntity(subject));
    const value = (attr: string) => {
      const found = rows.filter((r) => r.attribute === attr);
      assert.ok(
        found.length <= 1 &&
          found.every((r) => r.position <= position && r.value.type === "string"),
      );
      return found.length ? JSON.parse(found[0]!.value.value) : undefined;
    };
    const guard = value("p5/guard");
    const state = value("p5/state") ?? { items: [], pending: [], subjects: [] };
    if (guard) {
      assert.equal(guard.subject, subject);
      state.subjects = [guard];
    }
    for (const item of [...state.items, ...state.pending]) item.payload = JSON.parse(item.payload);
    return state;
  });
}

const fixture = JSON.parse(readFileSync("lab/world/W0/cases/C01-base-r1.json", "utf8")).input;
export async function evaluation(
  oracle: DomainOracle,
  tx: number,
  rate: number,
  validTime = W0.POPULATION_VALID_TIME,
  release = W0.R1,
  assertionTx = tx,
) {
  const world = structuredClone(fixture.world);
  Object.assign(
    world.facts.find((f: W0.Fact) => f.a === "payRateCents"),
    { v: rate, tx: assertionTx },
  );
  world.facts.push({
    e: world.facts.find((f: W0.Fact) => f.a === "location").v,
    a: "localMinWageCents",
    v: 1700,
    tx: 9,
  });
  const basis = { tx, validTime };
  const evaluated = W0.sweepSubject(world, release, basis);
  assert.ok(!("error" in evaluated));
  const output = JSON.parse(await oracle.call("evaluate", { world, release: release.name, basis }));
  assert.equal(evaluated.json, canonical(output));
  return { record: evaluated.record, wire: oracleRecord(output) };
}

export function oracleRecord(o: any) {
  return { basis: o.basis, release: o.release, subject: o.subject, workItems: o.workItems };
}
