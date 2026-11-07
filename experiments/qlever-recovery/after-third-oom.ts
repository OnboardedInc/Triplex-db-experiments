import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { Effect } from "effect";
import { EntityId, Triples } from "../../packages/core/dist/index.js";
import { Capabilities, DatabaseScope } from "../../packages/core/dist/runtime/index.js";
import { makeQleverClient, makeQleverRuntime } from "../../packages/qlever/dist/index.js";
const run = promisify(execFile),
  client = makeQleverClient("http://127.0.0.1:7019"),
  stamp = Date.now();
const inspect = async (name: string) =>
  JSON.parse((await run("docker", ["inspect", name])).stdout)[0];
const before = await inspect("triplex-qlever-local"),
  candidates = await Promise.all(
    ["triplex-qlever-candidate-a", "triplex-qlever-candidate-b"].map(inspect),
  );
if (
  before.State.Running ||
  before.State.Pid !== 0 ||
  !before.State.OOMKilled ||
  before.HostConfig.Memory !== 4 * 1024 ** 3 ||
  before.HostConfig.NanoCpus !== 4e9 ||
  candidates.some((item) => item.State.Running || item.State.Pid !== 0)
)
  throw new Error("Closed same-profile recovery prerequisites failed");
await mkdir(".qlever/backups", { recursive: true });
const backup = `.qlever/backups/third-oom-${stamp}.update-triples`;
await copyFile(".qlever/data/triplex.update-triples", backup);
const bytes = await readFile(backup),
  sourceBefore = await readdir("qualification/evidence");
await run("docker", ["start", "triplex-qlever-local"], { timeout: 10000 });
let stats: unknown;
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    stats = await client.command("stats", { timeoutMs: 500 });
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
if (!stats) throw new Error("Restored owned native worker is not ready");
const settings = await client.command("get-settings", { timeoutMs: 3000 }),
  restored = await inspect("triplex-qlever-local");
await import("../../packages/qlever/experiments/oom-recovery.js");
const newOldRecovery = (await readdir("qualification/evidence")).find(
  (name) =>
    name.startsWith("qlever-oom-recovery-") &&
    name.endsWith(".json") &&
    !sourceBefore.includes(name),
);
if (!newOldRecovery) throw new Error("Old acknowledged-state recovery receipt missing");
const oldState = JSON.parse(await readFile(`qualification/evidence/${newOldRecovery}`, "utf8"));
const readScope = async (scopeName: string, ids: readonly string[]) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const t = yield* Triples;
      return {
        position: yield* t.currentPosition(),
        receipts: (yield* t.transactions({ limit: 20 })).transactions,
        histories: yield* Effect.forEach(ids, (id) => t.history(EntityId.make(id))),
      };
    }).pipe(
      Effect.provide(
        makeQleverRuntime({ url: "http://127.0.0.1:7019" }).layer({
          scope: DatabaseScope.test(scopeName),
          capabilities: Capabilities.none,
        }),
      ),
      Effect.scoped,
    ),
  );
const scalarScope = "qlever-query:7a108a9b-39a9-4160-af8e-4f50158390b1",
  unicodeScope = "unicode-boundary:d4c87e02-ecee-4039-acd5-954fff2f3806";
const scalar = await readScope(scalarScope, ["42"]),
  unicode = await readScope(unicodeScope, ["json", "😀"]);
const scalarComplete =
  scalar.position === 1 &&
  scalar.receipts.length === 1 &&
  scalar.receipts[0]!.changes.length === 7 &&
  scalar.histories[0]!.length === 7 &&
  scalar.receipts[0]!.changes.every((change) =>
    scalar.histories[0]!.some(
      (fact) =>
        fact.id === change.tripleId && JSON.stringify(fact.value) === JSON.stringify(change.value),
    ),
  );
const unicodeComplete =
  unicode.position === 2 &&
  unicode.receipts.length === 2 &&
  JSON.stringify(unicode.histories[0]?.[0]?.value) ===
    JSON.stringify({ type: "json", value: { high: "\ud800", low: "\udfff", valid: "😀" } }) &&
  JSON.stringify(unicode.histories[1]?.[0]?.value) ===
    JSON.stringify({ type: "string", value: "😀 café e\u0301" });
const active = await client.command("dump-active-queries", { timeoutMs: 3000 });
const artifact = {
  at: new Date().toISOString(),
  oomEvidence: "qualification/evidence/qlever-third-oom-independent-20261106T153006.json",
  beforeState: before.State,
  afterState: restored.State,
  candidates: candidates.map((item) => ({ name: item.Name, state: item.State })),
  profile: {
    memory: restored.HostConfig.Memory,
    memorySwap: restored.HostConfig.MemorySwap,
    nanoCpus: restored.HostConfig.NanoCpus,
    startupScriptSha256: createHash("sha256")
      .update(await readFile("qlever-start.sh"))
      .digest("hex"),
  },
  stats,
  restartedDefaultSettings: settings,
  failureTimePlannerBudget: "UNOBSERVED; restarted settings are not historical proof",
  snapshot: {
    backup,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  },
  previousAcknowledgedState: { artifact: newOldRecovery, pass: oldState.pass },
  scalarScope,
  scalar,
  scalarComplete,
  unicodeScope,
  unicode,
  unicodeComplete,
  active,
  pass:
    oldState.pass &&
    scalarComplete &&
    unicodeComplete &&
    Object.keys(active as object).length === 0,
  claim:
    "Acknowledged receipts/cuts and exact typed facts survived this read-triggered OOM; no native updates issued by this recovery, no general write-failure/power-loss proof",
};
const path = `qualification/evidence/qlever-third-oom-recovery-${stamp}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(
  JSON.stringify({
    path,
    pass: artifact.pass,
    scalarComplete,
    unicodeComplete,
    planner: (settings as Record<string, unknown>)["query-planning-budget"],
    oldAcknowledgedState: oldState.pass,
  }),
);
