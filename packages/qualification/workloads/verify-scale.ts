import { parseLatencyReceipt } from "../../../lab/receipts/parse.ts";
/** Reopen a retained fixture through the same public API for either backend. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Effect } from "effect";
import { Triples } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope } from "@triplex-build/triplex/runtime";
import { loadQualificationBackend } from "@triplex-build/triplex-qualification";

const root = path.resolve(import.meta.dirname, "../../..");
const file = path.resolve(process.argv[2]!);
assert.ok(file.startsWith(path.join(root, "qualification") + path.sep));
const original = parseLatencyReceipt(readFileSync(file), { source: file });
const count = Number(original.acknowledgedEntities);
assert.ok(Number.isSafeInteger(count) && count > 0);
const backend = await loadQualificationBackend();
assert.equal(
  original.backend ?? "xtdb",
  backend.name,
  "A retained fixture belongs to its original backend",
);
const scope = original.scope as DatabaseScope;
const result = await Effect.runPromise(
  Effect.gen(function* () {
    const triples = yield* Triples;
    const rows = yield* triples.queryAll(
      {
        find: ["?count", "?sum"],
        where: [["?e", ":scale/index", "?v"]],
        aggregate: [
          ["count", "?e", "?count"],
          ["sum", "?v", "?sum"],
        ],
      },
      { basis: { validAt: 100 } },
    );
    assert.equal(rows.results[0]?.["?count"], count);
    assert.equal(rows.results[0]?.["?sum"], (count * (count - 1)) / 2);
    const distinct = yield* triples.queryPage(
      {
        inner: { find: ["?e"], where: [["?e", ":scale/index", "?v"]] },
        limit: 1,
        includeCount: true,
      },
      { basis: { validAt: 100 } },
    );
    assert.equal(distinct.totalCount, count);
    const latest = original.commands.at(-1);
    const receipt = yield* triples.transactionByCommand(latest.commandId);
    assert.equal(receipt?.position, latest.position);
    return {
      format: "triplex-scale-prefix-verification/2",
      backend: backend.name,
      timestampUtc: new Date().toISOString(),
      sourceReceipt: path.relative(root, file),
      status: "PASS",
      distinctEntities: count,
      independentDistinctEntityProjectionCount: distinct.totalCount,
      domainActiveFacts: original.acknowledgedDomainFacts,
      lastDurablePosition: receipt?.position,
      sum: (count * (count - 1)) / 2,
      scope,
      originalGateStatus: original.status,
      limitation:
        "Fresh public count/sum/receipt check of the retained acknowledged prefix; does not change the original gate status.",
    };
  }).pipe(
    Effect.provide(backend.makeRuntime().layer({ scope, capabilities: Capabilities.none })),
    Effect.scoped,
  ),
);
const output = file.replace(/\.json$/, `-${backend.name}-prefix-verification-${Date.now()}.json`);
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({ result: "PASS", backend: backend.name, output, distinctEntities: count }),
);
