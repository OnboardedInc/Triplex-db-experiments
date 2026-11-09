import { qleverConnectionModeOf } from "../src/QleverClient.js";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Effect } from "effect";
import { Triples, EntityId, integer, number } from "@triplex-build/triplex";
import { DatabaseScope, Capabilities } from "@triplex-build/triplex/runtime";
import { makeQleverRuntime } from "../src/index.js";
import { makeQleverClient } from "../src/QleverClient.js";

const run = randomUUID(),
  client = makeQleverClient("http://127.0.0.1:7019");
const scope = DatabaseScope.test(`recovery:${run}`),
  commandId = `recovery:${run}`;
const runtime = makeQleverRuntime({ url: "http://127.0.0.1:7019" });
const publicRun = <A, E>(effect: Effect.Effect<A, E, Triples>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(runtime.layer({ scope, capabilities: Capabilities.none })),
      Effect.scoped,
    ),
  );
await mkdir(".qlever/backups", { recursive: true });
const snapshot = ".qlever/data/triplex.update-triples";
await copyFile(snapshot, `.qlever/backups/${run}-before-cancel.update-triples`);
const beforeBytes = (await stat(snapshot)).size;
const original = await publicRun(
  Effect.gen(function* () {
    const t = yield* Triples;
    return yield* t.transact(
      [
        {
          op: "assert",
          entityId: EntityId.make("recovery:sentinel"),
          attribute: ":recovery/exact",
          value: integer("9223372036854775807"),
          validFrom: 1,
        },
        {
          op: "assert",
          entityId: EntityId.make("recovery:sentinel"),
          attribute: ":recovery/float",
          value: number(1.0000000000000002),
          validFrom: 1,
        },
      ],
      { commandId },
    );
  }),
);
const globalCount = async () =>
  Number(
    (await client.query("SELECT (COUNT(*) AS ?count) WHERE { GRAPH ?g { ?s ?p ?o } }"))[0]?.[
      "count"
    ]?.value ?? 0,
  );
const sourceCountBefore = await globalCount();
const graph = `<urn:triplex:cancel:${run}>`,
  queryId = `cancel-${run}`;
const values = Array.from({ length: 400 }, (_, index) => index).join(" ");
const query = `INSERT { GRAPH ${graph} { <urn:operation> <urn:receipt> "committed" . <urn:candidate> <urn:hash> ?hash } } WHERE { VALUES ?i { ${values} } VALUES ?j { ${values} } BIND(SHA256(CONCAT(STR(?i),":",STR(?j))) AS ?hash) }`;
const completion = client.update(query, { queryId, timeoutMs: 8000 }).then(
  (response) => ({ status: "completed", response }),
  (error) => ({ status: "error", error: String(error) }),
);
let activeObserved = false;
for (let attempt = 0; attempt < 30; attempt++) {
  const active = await client.command("dump-active-queries");
  if (JSON.stringify(active).includes(queryId)) {
    activeObserved = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 5));
}
let cancellationRequest: unknown;
try {
  await client.cancel(queryId);
  cancellationRequest = "native websocket cancel sent";
} catch (error) {
  cancellationRequest = String(error);
}
const outcome = await completion;
const activeAfter = JSON.stringify(await client.command("dump-active-queries")).includes(queryId);
const count = async () =>
  Number(
    (await client.query(`SELECT (COUNT(*) AS ?count) WHERE { GRAPH ${graph} { ?s ?p ?o } }`))[0]?.[
      "count"
    ]?.value ?? 0,
  );
const immediately = await count();
await client.update(
  `INSERT DATA { GRAPH <urn:triplex:publish:${run}> { <urn:tick> <urn:status> "published" } }`,
);
const afterPublication = await count(),
  sourceCountBeforeRestart = await globalCount();
await copyFile(snapshot, `.qlever/backups/${run}-before-restart.update-triples`);
const bytesBeforeRestart = (await stat(snapshot)).size;
if (bytesBeforeRestart - beforeBytes > 200 * 1024 * 1024)
  throw new Error("Probe exceeded admitted200MiB snapshot growth");
const restart = await promisify(execFile)("docker", ["restart", "triplex-qlever-local"], {
  timeout: 30_000,
});
let ready = false;
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    await client.command("stats", { timeoutMs: 1000 });
    ready = true;
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
if (!ready) throw new Error("Owned QLever did not become ready after restart");
const afterRestart = await count(),
  sourceCountAfterRestart = await globalCount();
const recovered = await publicRun(
  Effect.gen(function* () {
    const t = yield* Triples;
    return {
      receipt: yield* t.transactionByCommand(commandId),
      facts: yield* t.entity(EntityId.make("recovery:sentinel"), { validAt: 100 }),
      position: yield* t.currentPosition(),
    };
  }),
);
const receiptPreserved =
  recovered.receipt?.txId === original.txId &&
  recovered.receipt.changes.length === 2 &&
  recovered.facts.some(
    (fact) => fact.value.type === "integer" && fact.value.value === "9223372036854775807",
  ) &&
  recovered.facts.some(
    (fact) => fact.value.type === "number" && fact.value.value === 1.0000000000000002,
  );
const allOrNone = [0, 160001].includes(afterPublication) && afterRestart === afterPublication;
const artifact = {
  qleverConnectionMode: qleverConnectionModeOf(),
  run,
  version: "QLever0.6.0/6c5861a",
  profile: "4GiB4CPU",
  sourceCountBefore,
  sourceCountBeforeRestart,
  sourceCountAfterRestart,
  beforeBytes,
  bytesBeforeRestart,
  maxFixtureQuads: 160001,
  activeObserved,
  cancellationRequest,
  outcome,
  activeAfter,
  immediately,
  afterPublication,
  afterRestart,
  allOrNone,
  receiptPreserved,
  recovered,
  restartOutput: restart.stdout,
  claim:
    "native cancellation observed by active registry and completed HTTP outcome; clean container restart only, no power-loss/fsync claim",
};
const path = `qualification/evidence/qlever-cancel-restart-${run}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({ path, ...artifact }, null, 2));
