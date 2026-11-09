import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { memoryComposition } from "./lib/memory.ts";
import { memoryReferenceReader, dependencyPlans, resolveActivation } from "./lib/di01-refs.ts";
import { DependencyIndex } from "../../packages/host/dist/feed/index.js";
import { W0, V_W0 } from "./lib/w0-world.ts";
import { Probe, baseFacts, rows } from "../scenarios/v2/probe.ts";
import { affectedClaim, reconcileClaim } from "../scenarios/v2/claims.ts";
test("GS06b W02 v2 affectedClaim uses DI01 instead of kernel affected, replays feed and reruns exactly once", async () => {
  const dir =
    process.env.DI01_GS_EVIDENCE ??
    `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DI01/GS06-${randomUUID()}`;
  fs.mkdirSync(dir, { recursive: true });
  const comp = memoryComposition("xtdb", "DI01-GS06-" + randomUUID()),
    p = new Probe(comp, path.join(dir, "replay"));
  await p.commit(rows(baseFacts("pl:a")));
  await p.commit(rows(baseFacts("pl:b", "loc:b")));
  const index = new DependencyIndex(path.join(dir, "consumer.db"), {
    consumer: "c",
    validAt: V_W0,
    initialRelease: W0.R1.hash,
    plans: dependencyPlans(),
    readRefs: memoryReferenceReader(comp),
    resolveActivation,
  });
  await p.set("jur:a", "stateMinWageCents", 1850);
  const result = await affectedClaim(p, ["pl:a", "pl:b"], [["jur:a", "stateMinWageCents"]], {
    affectedAt: async (position) => {
      const page = await comp.feedPage(0, 100),
        entries = page.transactions.map((tx: any) => ({
          kind: "commit",
          stream: "GS06",
          epoch: "0",
          offset: String(tx.position),
          transactions: [
            {
              positions: [String(tx.position)],
              txIds: [tx.txId],
              operationId: tx.txId,
              commandIds: [],
              stamp: null,
              stampStatus: "pending-RT01",
              changes: tx.changes.map((c: any) => ({
                op: c.op,
                entity: c.entityId,
                attribute: c.attribute,
                assertionId: c.tripleId,
                position: String(tx.position),
                validFrom: c.validFrom,
                validTo: c.validTo ?? null,
              })),
            },
          ],
        }));
      await index.consume(null, {
        entries,
        cursor: { source: "DI01/GS06/memory", token: String(position) },
      } as any);
      return index.affectedAt("c", "0", String(position));
    },
  });
  assert.deepEqual(result.affected, ["pl:a"]);
  const output = (await reconcileClaim(p, 6, "pl:a")).output;
  assert(output.tasks.some((t: any) => t.rule === "MINWAGE"));
  assert(!(await p.domain("pl:b")).tasks.some((t: any) => t.rule === "MINWAGE"));
  fs.writeFileSync(
    path.join(dir, "result.json"),
    JSON.stringify(
      {
        attempt: p.attempt,
        sourceSha256: p.sourceSha256,
        status: "MATCH",
        affected: result.affected,
        checks: p.checks,
        claims: p.claims,
        oracleCases: p.oracleCases,
      },
      null,
      2,
    ),
  );
  index.close();
});
