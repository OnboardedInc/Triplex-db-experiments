import { writeFile, copyFile, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { makeQleverClient } from "../../packages/qlever/src/QleverClient.js";
import { graphIri, fieldIri, operationIri } from "../../packages/qlever/src/rdf.js";
const run = promisify(execFile),
  client = makeQleverClient("http://127.0.0.1:7019");
const scope = JSON.stringify([
    "triplex-scope-v1",
    "test",
    "test",
    "unicode-boundary:33b7efa3-6efb-4a6a-8839-5dff5bc9f21e",
    0,
  ]),
  operation = "7df239e0-1c80-4b9e-8e94-bd8a6d331abe";
const inspect = async () =>
  JSON.parse((await run("docker", ["inspect", "triplex-qlever-local"])).stdout)[0];
const read = async () => ({
  marker: await client.query(
    `SELECT ?attempt WHERE { GRAPH ${graphIri(scope)} { ${operationIri(operation)} ${fieldIri("attempt_id")} ?attempt } }`,
    { timeoutMs: 3000 },
  ),
  footprint: await client.query(
    `SELECT (COUNT(*) AS ?count) WHERE { GRAPH ${graphIri(scope)} { ?s ?p ?o } }`,
    { timeoutMs: 3000 },
  ),
  active: await client.command("dump-active-queries", { timeoutMs: 3000 }),
});
const beforeState = await inspect(),
  before = await read();
if (Object.keys(before.active as object).length)
  throw new Error("Native registry must be empty before exclusive closed reload");
const stamp = Date.now();
await mkdir(".qlever/backups", { recursive: true });
const backup = `.qlever/backups/unicode-parse-${stamp}.update-triples`;
await run("docker", ["stop", "-t", "5", "triplex-qlever-local"], { timeout: 15000 });
const closed = await inspect();
if (closed.State.Running || closed.State.Pid !== 0) throw new Error("Native epoch did not close");
await copyFile(".qlever/data/triplex.update-triples", backup);
const snapshot = await readFile(backup);
await run("docker", ["start", "triplex-qlever-local"], { timeout: 10000 });
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    await client.command("stats", { timeoutMs: 500 });
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
const afterState = await inspect(),
  after = await read();
const pass =
  !before.marker.length &&
  before.footprint[0]?.["count"]?.value === "0" &&
  !after.marker.length &&
  after.footprint[0]?.["count"]?.value === "0" &&
  afterState.State.StartedAt !== beforeState.State.StartedAt &&
  afterState.HostConfig.Memory === 4 * 1024 ** 3 &&
  afterState.HostConfig.NanoCpus === 4e9;
const artifact = {
  at: new Date().toISOString(),
  operation,
  scope,
  pass,
  before,
  after,
  closed: { ...closed.State },
  beforeEpoch: beforeState.State.StartedAt,
  afterEpoch: afterState.State.StartedAt,
  snapshot: {
    backup,
    bytes: snapshot.length,
    sha256: createHash("sha256").update(snapshot).digest("hex"),
  },
  profile: { memory: afterState.HostConfig.Memory, cpu: afterState.HostConfig.NanoCpus },
  claim:
    "This exact failed parser request left no scoped footprint in a closed and reloaded native epoch; not a general HTTP-error rollback guarantee",
};
const path = `qualification/evidence/qlever-unicode-parse-resolution-${stamp}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(
  JSON.stringify({
    path,
    pass,
    scopeFootprint: after.footprint,
    oldEpoch: beforeState.State.StartedAt,
    newEpoch: afterState.State.StartedAt,
  }),
);
