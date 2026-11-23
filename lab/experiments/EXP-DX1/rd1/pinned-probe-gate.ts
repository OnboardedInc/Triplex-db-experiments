import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openComposition } from "../../../bench/lib/composition.ts";
import { ids } from "../../../bench/lib/world.ts";

// [DX-RD2] Mac correctness gate for pinned-probe.clj: a small lean scope written through the SDK, a pin, then edits of
// every fifth person after the pin; the probe runs inside the gate container against that scope. Times are diagnostic.
// Rejected: gating the probe only on a synthetic Datomic schema (it must call the gateway's own read-rows).
const [out] = process.argv.slice(2), slot = "rd2-gate";
assert(out && path.isAbsolute(out) && !fs.existsSync(out), "Usage: pinned-probe-gate.ts NEW_ABSOLUTE_OUT");
fs.mkdirSync(out, { recursive: true });
const people = Number(process.env.RD2_GATE_PEOPLE ?? 400), rounds = Number(process.env.RD2_GATE_ROUNDS ?? 4);
const attribute = ":placement/rd2-value";

// [DX-RD2] Why: an own container from the existing Datomic base image, with no image build and no shared slot.
// Rejected: the lab slot (its image must be rebuilt first, which retags shared image names).
const external = process.env.RD2_GATE_EXTERNAL;  // e.g. http://127.0.0.1:18633 from pinned-probe-server-gate.sh
const container = "rd2-pinned-gate", port = 18631;
const repo = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
if (!external) execFileSync("docker", ["rm", "-f", container], { stdio: "ignore" });
if (!external) execFileSync("docker", ["run", "-d", "--name", container, "--memory", "3g", "--cpus", "2", "-p", `127.0.0.1:${port}:8080`,
  "-v", `${repo}/packages/datomic/gateway/src:/opt/gateway/src:ro`, "-v", `${import.meta.dirname}:/rd1:ro`,
  "--entrypoint", "/bin/bash", process.env.RD2_GATE_IMAGE ?? "tx2-datomic:1.0.7745-da00", "/rd1/pinned-probe-gate.sh"]);
const inContainer = async <T,>(slotName: string, work: (slot: string) => Promise<T>) => {
  if (external) {
    process.env.DATOMIC_URL = external;
    process.env.DATOMIC_READ_URLS = external;
    process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
    return await work(slotName);
  }
  try {
    const deadline = Date.now() + 180_000;
    for (;;) {
      try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) break; } catch { /* starting */ }
      assert(Date.now() < deadline, "Gate gateway did not become healthy");
      await new Promise((r) => setTimeout(r, 1000));
    }
    process.env.DATOMIC_URL = `http://127.0.0.1:${port}`;
    process.env.DATOMIC_READ_URLS = process.env.DATOMIC_URL;
    process.env.TRIPLEX_DATOMIC_LAYOUT = "lean";
    return await work(slotName);
  } finally {
    fs.writeFileSync(path.join(out, "container.log"), execFileSync("docker", ["logs", container], { encoding: "utf8", maxBuffer: 64 * 1024 ** 2 }));
    execFileSync("docker", ["rm", "-f", container], { stdio: "ignore" });
  }
};
const result = await inContainer(slot, async (slotName) => {
  const attempt = randomUUID(), scope = `rd2-pinned-${attempt}`;
  const runtime = await openComposition("reach", "datomic", scope);
  const current = new Map<string, string>();
  let position = 0;
  const put = async (entity: string, value: string) => {
    const predecessor = current.get(entity);
    const r = await runtime.transact([
      ...(predecessor ? [{ op: "retract", id: predecessor }] : []),
      { op: "assert", entityId: entity, attribute, value: { type: "string", value }, validFrom: 1 },
    ], { commandId: `${attempt}-${entity}-${value}`, actor: "probe" });
    if (!r.ok) throw Error(`Fixture transaction returned ${r.tag}: ${String(r.error)}`);
    const row = r.value.triples.find((t) => t.entityId === entity && t.attribute === attribute)!;
    assert.equal(row.value.value, value);
    current.set(entity, row.id);
    position = r.value.position;
  };
  try {
    const entities = Array.from({ length: people }, (_, i) => ids.placement(i));
    for (const [i, e] of entities.entries()) await put(e, `seed-${i}`);
    const pin = position;
    for (let k = 0; k < rounds; k++) for (let i = 0; i < people; i += 5) await put(entities[i]!, `edit-${i}-${k}`);
    const head = position;
    if (external) {
      // [DX-RD2] Why: hand pinned-probe-server.sh the same people in its own subjects format.
      // Rejected: the server's generated SCALE1 IDs, which do not exist in this small scope.
      const subjects = Array.from({ length: 4000 }, (_, i) => ({ entity: entities[(i * 7) % people]!, subject: (i * 7) % people, account: 0 }));
      fs.writeFileSync(path.join(out, "subjects.json"), JSON.stringify({ dbContains: scope, pin, validAt: 1, attribute, subjects, arm: 60 }));
      return { slot: slotName, scope, pin, head, people, rounds };
    }
    const template = "datomic:dev://localhost:4334/{db}";
    // Probe order: each arm takes the next `arm` subjects; repeat the list so every arm has people.
    const subjects = Array.from({ length: 6 * 60 }, (_, i) => ({ entity: entities[(i * 7) % people]!, subject: (i * 7) % people, account: 0 }));
    const config = { uriTemplate: template, dbContains: scope, pin, validAt: 1, attribute, subjects, arm: 60, threads: 4,
      concurrentSeconds: 5, recentBack: 10 };
    fs.writeFileSync(path.join(out, "config.json"), JSON.stringify(config));
    execFileSync("docker", ["exec", container, "mkdir", "-p", "/tmp/rd2"]);
    for (const f of ["config.json"]) execFileSync("docker", ["cp", path.join(out, f), `${container}:/tmp/rd2/${f}`]);
    execFileSync("docker", ["cp", path.join(import.meta.dirname, "pinned-probe.clj"), `${container}:/tmp/rd2/pinned-probe.clj`]);
    execFileSync("docker", ["exec", "-e", "TX2_READ_PERMITS=4", container, "sh", "-c",
      "cd /opt/datomic && DATOMIC_EXT_CLASSPATH=/opt/gateway/src java -Xmx768m -Ddatomic.objectCacheMax=64m " +
      "-cp \"$(DATOMIC_EXT_CLASSPATH=/opt/gateway/src bin/classpath)\" clojure.main /tmp/rd2/pinned-probe.clj /tmp/rd2/config.json /tmp/rd2/out.ndjson"],
      { stdio: "inherit", timeout: 300_000 });
    execFileSync("docker", ["cp", `${container}:/tmp/rd2/out.ndjson`, path.join(out, "out.ndjson")]);
    return { slot: slotName, scope, pin, head, people, rounds };
  } finally { await runtime.close(); }
});
if (external) { console.log(JSON.stringify(result)); process.exit(0); }
const lines = fs.readFileSync(path.join(out, "out.ndjson"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const start = lines.find((l) => l.kind === "start"), check = lines.find((l) => l.kind === "shortcut-check");
assert.equal(start.pin, result.pin);
assert.equal(start.head, result.head);
assert(lines.some((l) => l.kind === "end"), "Probe did not finish");
const reads = lines.filter((l) => l.kind === "read");
// Every read returns exactly the one field row; the pinned arms return the seed value (checked by the probe's equality).
assert(reads.every((l) => l.rows === 1), "A read returned other than one row");
assert(reads.filter((l) => l.arm === "pinned").some((l) => l.editedAfterPin) && reads.filter((l) => l.arm === "pinned").some((l) => !l.editedAfterPin));
assert.equal(check.mismatches, 0, "Revision short-cut differs from the as-of route");
assert(check.answeredFromCurrent > 0 && check.answeredFromCurrent < check.reads);
assert(reads.filter((l) => l.arm === "pinned").every((l) => l.route === "as-of"));
assert(reads.filter((l) => l.arm === "current").every((l) => l.route === "source"));
console.log(JSON.stringify({ diagnostic: "Mac gate; times are not results", ...result, shortcut: check,
  arms: lines.filter((l) => l.kind === "arm") }, null, 2));
