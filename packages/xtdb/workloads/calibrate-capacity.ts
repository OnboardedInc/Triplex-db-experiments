/** Freeze the approved owner/phase model before observing calibration inputs. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { makeXtdbClient } from "@triplex-build/triplex-xtdb";

const root = path.resolve(import.meta.dirname, "../../..");
const args = process.argv.slice(2);
const option = (key: string, fallback: string) =>
  args.includes(key) ? args[args.indexOf(key) + 1]! : fallback;
const prefixFile = path.resolve(option("--prefix", ""));
assert.ok(prefixFile.startsWith(path.join(root, "qualification") + path.sep));
const prefix = JSON.parse(readFileSync(prefixFile, "utf8"));
assert.ok(prefix.acknowledgedEntities > 0);
const output = path.resolve(
  option(
    "--output",
    path.join(root, "qualification/evidence", `capacity-model-v2-${randomUUID()}.json`),
  ),
);
assert.ok(output.startsWith(path.join(root, "qualification") + path.sep));
const model: Record<string, unknown> = {
  format: "triplex-xtdb-capacity-model/2",
  status: "MEASURING",
  timestampUtc: new Date().toISOString(),
  modelFrozenBeforeMeasurement: true,
  sourcePrefix: path.relative(root, prefixFile),
  scope: prefix.scope,
  uncertaintyMultiplier: 2,
  minimumUnitBytes: 1024,
  formula: {
    unit: "max(1024, currentDatabaseAllocatedBytes / allRetainedAssertions * sourceScopeRetainedAssertions / sourceScopeDomainFacts)",
    finalData: "currentData + remainingDomainFacts * unit * 2",
    loadingPeakOwned: "currentOwned + 2*(finalData-currentData) + finalData",
    stoppedBackupRestorePeakOwned: "(currentOwned-currentData) + 3*finalData",
    admittedPeakOwned: "max(loadingPeakOwned, stoppedBackupRestorePeakOwned)",
  },
  limitations: [
    "Owner-average estimate with frozen2x future-growth uncertainty; no physical impossibility or linear-growth guarantee.",
    "All actual owned project/image/container bytes still count against unchanged12GiBcap; only database bytes are extrapolated per assertion.",
    "Loading/compaction and stopped backup/restore are distinct phases; reserve their maximum rather than sum six simultaneous copies.",
    "Existing retained failed fixtures/backups remain charged; nothing is deleted or discounted.",
    "Shared background database work contributes to actual data bytes and remains charged on every future admission.",
  ],
};
writeFileSync(output, JSON.stringify(model, null, 2) + "\n", { flag: "wx" });
const resource = JSON.parse(
  execFileSync(
    process.execPath,
    [path.join(root, "scripts/xtdb-resources.mjs"), "--planned-bytes", "0", "--require-server"],
    { encoding: "utf8" },
  ),
);
const client = makeXtdbClient(
  process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@localhost:5442/xtdb",
);
try {
  const all = await client.query("SELECT COUNT(*) AS count FROM tx_assertions FOR ALL VALID_TIME");
  const own = await client.query(
    "SELECT COUNT(*) AS count FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ?",
    [prefix.scope],
  );
  const allRetainedAssertions = Number(all[0]?.["count"]),
    sourceScopeRetainedAssertions = Number(own[0]?.["count"]);
  assert.ok(Number.isSafeInteger(allRetainedAssertions) && allRetainedAssertions > 0);
  assert.ok(
    Number.isSafeInteger(sourceScopeRetainedAssertions) && sourceScopeRetainedAssertions > 0,
  );
  const unitBytesPerDomainFact = Math.max(
    1024,
    ((resource.databaseAllocatedBytes.value / allRetainedAssertions) *
      sourceScopeRetainedAssertions) /
      prefix.acknowledgedDomainFacts,
  );
  Object.assign(model, {
    status: "CALIBRATED_MODEL_V2",
    resource,
    allRetainedAssertions,
    sourceScopeRetainedAssertions,
    sourceScopeDomainFacts: prefix.acknowledgedDomainFacts,
    unitBytesPerDomainFact,
  });
} catch (error) {
  model["status"] = "FAIL";
  model["error"] = String(error);
  process.exitCode = 1;
} finally {
  await client.close();
  writeFileSync(output, JSON.stringify(model, null, 2) + "\n");
  console.log(
    JSON.stringify({
      result: model["status"],
      output,
      unitBytesPerDomainFact: model["unitBytesPerDomainFact"],
    }),
  );
}
