import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedCommands } from "../../../bench/lib/w0-seed.ts";
import { W0, V_W0, many, triplexValue, canonical } from "../../../bench/lib/w0-world.ts";
// [DX-H5] Why: measure genuine public command concurrency without pretending reordered tx values are W0.
// Rejected: changing oracle/reference positions to match an easier concurrent population.
process.env.TX2_P5_CLOCK_START = String(V_W0);
const N = 200,
  out = "runs/DX-H5-vm";
fs.mkdirSync(out, { recursive: true });
const reports: any[] = [];
for (const concurrency of [1, 8, 16, 32]) {
  const scope = "dxh5-probe-" + concurrency + "-" + randomUUID(),
    comp = await openComposition("reach", "datomic", scope);
  const log = fs.openSync(out + `/probe-${concurrency}.ndjson`, "wx");
  const latest = new Map<string, string>(),
    positions = new Set<number>();
  let reordered = 0,
    commands = 0;
  const start = performance.now();
  try {
    const R = W0.rung(N),
      groups = new Map<
        string,
        ReturnType<typeof seedCommands> extends Generator<infer T> ? T[] : never
      >();
    const submit = async (c: any) => {
      const operations: any[] = [];
      for (const [entityId, attribute, value] of c.rows) {
        const key = entityId + "\0" + attribute;
        if (!many.has(attribute) && c.validFrom <= V_W0 && latest.has(key))
          operations.push({ op: "retract", id: latest.get(key) });
        operations.push({
          op: "assert",
          entityId,
          attribute,
          value: triplexValue(attribute, value),
          validFrom: c.validFrom,
          ...(attribute === "payRateCents" &&
          c.validFrom <= V_W0 &&
          W0.plan(R, Number(entityId.slice(4))).raise
            ? { validTo: Date.parse("2026-11-16T00:00:00Z") }
            : {}),
        });
      }
      const r = await comp.transact(operations, { commandId: "probe:" + c.position });
      if (!r.ok) throw Error(c.position + ":" + r.tag);
      if (positions.has(r.value.position)) throw Error("duplicate committed position");
      positions.add(r.value.position);
      if (r.value.position !== c.position) reordered++;
      for (const t of r.value.triples)
        if (!many.has(t.attribute)) latest.set(t.entityId + "\0" + t.attribute, t.id);
      commands++;
      fs.writeSync(log, canonical({ reference: c.position, receipt: r.value }) + "\n");
    };
    // Shared prelude is ordered; each subject's commands remain ordered within its worker.
    for (const c of seedCommands(N)) {
      const subject = c.rows[0]![0].split("/")[0]!;
      if (!subject.startsWith("pl:")) await submit(c);
      else {
        const list = groups.get(subject) ?? [];
        list.push(c);
        groups.set(subject, list);
      }
    }
    const plans = [...groups.values()];
    let next = 0;
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (next < plans.length) {
          const plan = plans[next++]!;
          for (const c of plan) await submit(c);
        }
      }),
    );
    const wallMs = performance.now() - start;
    if (positions.size !== W0.populationBasis(R).tx || Math.max(...positions) !== positions.size)
      throw Error("coverage gap");
    reports.push({
      N,
      scope,
      concurrency,
      commands,
      wallMs,
      commandsPerS: commands / (wallMs / 1000),
      referencePositionMismatches: reordered,
      classification: "DIAGNOSTIC-NOT-A-REFERENCE-SEED",
    });
    console.error(JSON.stringify(reports.at(-1)));
  } finally {
    fs.closeSync(log);
    await comp.close();
    fs.writeFileSync(out + "/probe.json", JSON.stringify(reports, null, 2) + "\n");
  }
}
