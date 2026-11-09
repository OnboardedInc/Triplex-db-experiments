// [EXP-DX1] Why: suspend only our transactor and verify observed read contents and exact basis.
// Rejected: merely checking d/sync source or timing a healthy transactor.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { Effect } from "effect";
import {
  DatomicClient,
  makeDatomicStorageAdapter,
} from "../../../../packages/datomic/dist/index.js";
import { DatabaseScope } from "../../../../packages/core/dist/runtime/index.js";
const lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
const until = Date.now() + 15 * 60_000;
for (; process.env["DX1_MEASUREMENT_LOCK_HELD"] !== "1";) {
  try {
    fs.mkdirSync(lock);
    break;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (Date.now() > until) throw Error("Measurement lock timeout");
    await new Promise((r) => setTimeout(r, 5000));
  }
}
const docker = (args) =>
  execFileSync("docker", ["--host", "unix:///Users/sam/.colima/triplex2/docker.sock", ...args], {
    encoding: "utf8",
  });
const client = new DatomicClient("http://127.0.0.1:8490", 2000);
const scope = DatabaseScope.test(`dx1-no-transactor-${randomUUID()}`);
const adapter = makeDatomicStorageAdapter(client, scope);
let pid,
  stopped = false,
  ownsLock = process.env["DX1_MEASUREMENT_LOCK_HELD"] !== "1";
const releaseLock = () => {
  if (ownsLock) {
    fs.rmdirSync(lock);
    ownsLock = false;
  }
};
const abort = () => {
  if (stopped) {
    docker(["exec", "tx2-dxb1-dev", "kill", "-CONT", pid]);
    stopped = false;
  }
  client.close();
  releaseLock();
  process.exit(130);
};
process.once("SIGINT", abort);
process.once("SIGTERM", abort);
const watchdog = setTimeout(abort, 14 * 60_000);
watchdog.unref();
try {
  await Effect.runPromise(adapter.initialize());
  const { db } = await client.create(scope);
  await Effect.runPromise(
    adapter.withTransaction(
      Effect.gen(function* () {
        const p = yield* adapter.nextCommitPosition();
        yield* adapter.insert(
          {
            entityId: "root",
            attribute: ":dx/value",
            value: { type: "string", value: "known-row" },
            validFrom: 0,
          },
          "_tx/00000000000000000000000001",
          100,
          "00000000000000000000000001",
          p,
        );
      }),
    ),
  );
  const basis = await client.basis(db);
  assert.equal(basis.position.v, "1");
  const input = { root: "root", basis: { recordedPosition: 1, validAt: 100 } };
  // Prime JIT/peer indexes before freezing the process, then check every observed byte family.
  for (let i = 0; i < 30; i++) {
    await client.request("POST", `/v2/db/${db}/reach`, input);
    await client.rows(db, { entityIds: ["root"], basis: input.basis });
    await client.basis(db);
  }
  const processList = docker(["exec", "tx2-dxb1-dev", "ps", "-eo", "pid,args"]);
  const line = processList
    .split("\n")
    .find((l) =>
      l.includes("clojure.main --main datomic.launcher /data/effective-transactor.properties"),
    );
  assert.ok(line, "exact owned transactor command");
  pid = line.trim().split(/\s+/)[0];
  assert.match(pid, /^\d+$/);
  const container = JSON.parse(docker(["inspect", "tx2-dxb1-dev"]))[0];
  assert.equal(container.HostConfig.CpusetCpus, "6,7");
  assert.equal(container.HostConfig.Memory, 3 * 1024 ** 3);
  docker(["exec", "tx2-dxb1-dev", "kill", "-STOP", pid]);
  stopped = true;
  assert.match(docker(["exec", "tx2-dxb1-dev", "cat", `/proc/${pid}/status`]), /State:\s+T/);
  const results = [];
  for (let i = 0; i < 30; i++) {
    for (const route of ["reach", "read", "basis"]) {
      const start = performance.now();
      const answer =
        route === "reach"
          ? await client.request("POST", `/v2/db/${db}/reach`, input)
          : route === "read"
            ? await client.rows(db, { entityIds: ["root"], basis: input.basis })
            : await client.basis(db);
      const ms = performance.now() - start;
      if (route === "reach") {
        assert.equal(answer.position, 1);
        assert.equal(answer.rows.length, 1);
        assert.ok(JSON.stringify(answer.rows).includes("known-row"));
      } else if (route === "read") {
        assert.equal(answer.length, 1);
        assert.equal(answer[0].value_string, "known-row");
      } else assert.equal(answer.position.v, "1");
      results.push({ route, ms, answer });
    }
  }
  const summary = Object.fromEntries(
    ["reach", "read", "basis"].map((route) => {
      const times = results
        .filter((r) => r.route === route)
        .map((r) => r.ms)
        .sort((a, b) => a - b);
      return [route, { p50: times[15], max: times.at(-1), n: times.length }];
    }),
  );
  const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  const sourceHashes = Object.fromEntries(
    ["main.clj", "storage.clj", "reach.clj"].map((p) => [
      p,
      hash(
        `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B1/stage/gateway/src/triplex/gateway/${p}`,
      ),
    ]),
  );
  sourceHashes.clientBuild = hash("packages/datomic/dist/DatomicClient.js");
  const record = {
    diagnostic: true,
    sourceHashes,
    sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    containerId: container.Id,
    transactorPid: pid,
    db,
    basis,
    summary,
    results,
  };
  fs.writeFileSync(
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B1/reads-without-transactor.json",
    JSON.stringify(record, null, 2),
  );
  console.log(JSON.stringify(summary));
} finally {
  if (stopped) docker(["exec", "tx2-dxb1-dev", "kill", "-CONT", pid]);
  await client.delete(scope).catch((error) => console.error(error));
  client.close();
  clearTimeout(watchdog);
  releaseLock();
}
