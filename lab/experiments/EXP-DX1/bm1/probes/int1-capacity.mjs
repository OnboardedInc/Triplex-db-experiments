import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as wait } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const [requestFile] = process.argv.slice(2);
const request = JSON.parse(fs.readFileSync(requestFile));
const { source, slot, mode, people, seed } = request;
const directory = path.dirname(requestFile);
const access = JSON.parse(fs.readFileSync(path.join(directory, "access.json")));
const sha = (input) => createHash("sha256").update(input).digest("hex");
const digest = (value) => sha(JSON.stringify(value));
const save = (name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value) + "\n", { flag: "wx" });
const code = (name) => import(pathToFileURL(path.resolve(name)).href);
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), source);
assert.equal(access.prefix, slot);
assert.equal(access.writeUrl, process.env.DATOMIC_URL);
assert.equal(access.readUrl, process.env.DATOMIC_READ_URLS);
assert.equal(process.env.DX_INT1_COHORT, "spread");
assert.equal(process.env.DX_TOUCHED_READ_MODE, "validated");
const small = mode === "small";
assert.equal(people, small ? 1000 : 1_000_000);
assert(["small", "hot", "full"].includes(mode));
const { openComposition } = await code("lab/bench/lib/composition.ts");
const { V_W0 } = await code("lab/bench/lib/w0-world.ts");
const { canonicalWorld } = await code("lab/bench/lib/canonical.ts");
const { Account, rootOf } = await code("lab/experiments/EXP-DX1/int1/account.ts");
const { startReader, processSize } = await code("lab/experiments/EXP-DX1/int1/reader.ts");
const { activePerson } = await code("lab/experiments/EXP-DX1/int1/cohort.ts");
const { nativeMetrics } = await code("lab/experiments/EXP-DX1/thin1/native-metrics.ts");
const cohort = Array.from({ length: people / 50 }, (_, i) => activePerson(i, people, true));
const maxSaves = small ? 20 : 1000;
const hot = mode === "hot";
const scope = hot ? slot + "-hot" : seed.scope;
const binding = digest([source, slot, scope, mode, people, request.nonce, request.snapshotSha256]);
const comp = await openComposition("reach", "datomic", scope);
const reader = startReader(binding, 16 * 1024 ** 2);
const ledger = new DatabaseSync(path.join(directory, "measurement.sqlite"));
const account = new Account(comp, "thin", hot ? binding : seed.binding, 0, people, ledger);
const now = () => performance.timeOrigin + performance.now();
const observation = (outcome) => fs.appendFileSync(path.join(directory, "observations.jsonl"), JSON.stringify(outcome) + "\n");

try {
  if (hot) {
    assert.equal(await comp.currentPosition(), 0);
    for (let i = 0; i < cohort.length; i += 48) await account.seed(cohort.slice(i, i + 48));
  } else {
    assert.equal(await comp.currentPosition(), seed.cut);
    // [DX-BM1] Why: use the retained native receipt and expected-row ledger as the independent read oracle.
    // Rejected: fresh expected values built from what the restored database happened to return.
    ledger.prepare("ATTACH DATABASE ? AS original").run(seed.ledger);
    ledger.exec("INSERT INTO people SELECT * FROM original.people; INSERT INTO wanted SELECT * FROM original.wanted; INSERT INTO tx SELECT * FROM original.tx; DETACH original");
    account.head = seed.cut;
  }
  assert.equal(ledger.prepare("SELECT count(*) AS n FROM people").get().n, hot ? cohort.length : people);
  assert.equal(await comp.currentPosition(), account.head);
  const cut = account.head;
  await reader.open(scope);
  const snapshots = [];
  const capture = async (label) => {
    const sample = {
      binding, label, at: now(), cut: account.head, reader: await reader.stats(false),
      driver: processSize(false), native: await nativeMetrics(access),
    };
    assert.equal(await comp.currentPosition(), account.head);
    snapshots.push(sample);
    observation({ kind: "resources", ...sample });
  };
  const pull = async (kind, subject, position) => {
    const start = now();
    const result = await reader.pull(scope, rootOf("thin", subject), position, V_W0);
    const finish = now();
    account.verify(subject, position, V_W0, result);
    const expectation = account.expected(subject, position, V_W0);
    const expected = sha(canonicalWorld(expectation));
    const observed = sha(canonicalWorld(result.triples));
    assert.equal(expected, observed);
    observation({ kind, subject, position, start, finish, expected, observed,
                  facts: expectation.length, route: result.route, roundTrips: result.roundTrips });
  };
  await capture("before-activity");
  for (const subject of cohort) await pull("first", subject, cut);
  for (let i = 0; i < 3; i++) {
    if (i) await wait(2000);
    await capture("fixed-" + i);
  }
  // Use the same deterministic subset of the 2% active set in both stacks.
  for (let i = 0; i < maxSaves; i++) {
    const subject = cohort[i * (cohort.length / maxSaves)];
    const before = account.head;
    const start = now();
    const ack = await account.update(subject);
    const verified = now();
    assert.equal(ack.position, before + 1);
    observation({ kind: "save", subject, start, verified, position: ack.position,
                  command: account.binding.slice(0, 18) + "-" + ack.position,
                  receipt: ack.txId, nativeAckMs: account.commits.at(-1), clock: ack.instant });
    await pull("own", subject, ack.position);
    await pull("resident", subject, ack.position);
    await pull("past", subject, before);
  }
  await capture("after-activity");
  assert.equal(await comp.currentPosition(), cut + maxSaves);
  save("reading.json", {
    source, slot, scope, mode, people, seedCut: cut, finalCut: account.head, binding,
    cohortSha256: digest(cohort), saves: maxSaves, firstReads: cohort.length, reads: account.reads,
    snapshotLabels: snapshots.map((row) => row.label), requestSha256: sha(fs.readFileSync(requestFile)),
  });
} finally {
  await reader.close();
  await comp.close();
  ledger.close();
}
