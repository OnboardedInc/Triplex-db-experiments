import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { W0, canonical, sha256, type WorldRow } from "../../../../bench/lib/w0-world.ts";
import { ids, type Fact } from "../../../../bench/lib/world.ts";
import { integer, string } from "../../../../bench/lib/deep-world.ts";
import { makeDeepTrace } from "../../../../bench/lib/deep-trace.ts";
import { liveArrivals, liveEdits } from "../../scale1/deep-live.ts";
import { Documents } from "../../notify1/store.ts";
import { measureW0Http } from "../../../../bench/lib/w0-http.ts";
import { seed, valid } from "../fixture.ts";
import { openStore, millis } from "../store.ts";
import { JoinedAccount } from "./account.ts";
import { rawDeep, replaceDeep } from "./deep.ts";
import { authoredSeed, authoredWrite, compareSource, expectedPolicy } from "./deep-reference.ts";
import { Reference } from "./check.ts";

const [count, root, flag] = process.argv.slice(2),
  n = Number(count),
  smoke = flag === "--local";
assert(root && (smoke ? n === 1000 : process.platform === "linux" && n === 100000));
const ownerPath = process.env.TRIPLEX_LAB_SLOT_OWNER!,
  ownerBytes = readFileSync(ownerPath),
  owner = JSON.parse(ownerBytes.toString("utf8"));
assert(
  owner.mode === "exclusive" &&
    owner.endpoint === process.env.DATOMIC_URL &&
    owner.container &&
    owner.volume,
);
const save = (name: string, data: unknown) =>
  writeFileSync(join(root, name + ".json"), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 << 20 }).trim();
const source = git("rev-parse", "HEAD");
assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
const files = git(
  "ls-files",
  "lab/experiments/EXP-DX1/actv-lazy",
  "lab/experiments/EXP-DX1/actv-delta",
  "lab/experiments/EXP-DX1/scale1/deep-live.ts",
  "lab/experiments/EXP-DX1/notify1",
  "lab/bench/lib",
  "lab/oracles/domain",
  "packages/w0/src",
  "packages/datomic/src",
  "pnpm-lock.yaml",
).split("\n");
const pins = Object.fromEntries(files.map((f) => [f, sha256(readFileSync(f))]));
const build: Record<string, string> = {};
for (const pkg of ["core", "qualification", "host", "datomic", "w0"]) {
  const root = "packages/" + pkg + "/dist";
  for (const file of readdirSync(root, { recursive: true, encoding: "utf8" }))
    if (file.endsWith(".js")) {
      const path = join(root, file);
      build[path] = sha256(readFileSync(path));
    }
}
const config = join(process.env.TX2_CONFIG_DIR ?? ".", "lab/config/slots.json");
const configDigest = sha256(readFileSync(config));
const attempt = {
  source,
  nonce: randomUUID(),
  owner: sha256(ownerBytes),
  slot: owner.container,
  volume: owner.volume,
  n,
  smoke,
  pins,
  build,
  config: configDigest,
};
save("server-inputs", attempt);
if (!smoke) {
  const pre = join(root, "preflight");
  mkdirSync(pre);
  for (const f of ["stage-gate.ts", "deadline-gate.ts"])
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", new URL(f, import.meta.url).pathname, pre],
      { stdio: "inherit", timeout: 180000 },
    );
}
const store = await openStore("lazy-join-server-" + attempt.nonce, "act2-deep");
const readStore = await openStore(store.scope, "act2-deep", "read");
const ref = new Reference();
type Change = { p: number; rows: WorldRow[] };
const tape = new Map<number, Change[]>();
const clock = () => performance.now();
const seeded = await seed(store, n);
const account = new JoinedAccount(store),
  reader = new JoinedAccount(readStore).reader();
await account.install(seeded.roster, valid, true);
const numberOfSaves = smoke ? 250 : 3500;
const events = makeDeepTrace("joined-scale-source/1", n, numberOfSaves * 2).events.filter(
  (x) => !x.resend,
);
assert(events.length >= numberOfSaves);
let eventNumber = 0;
const authored = (i: number, p: number) =>
  tape.get(i)?.findLast((x) => x.p <= p)?.rows ?? authoredSeed(i, seeded.seedPosition(i));
const expected = (i: number, p: number) => expectedPolicy(i, authored(i, p));
const beforeMs = millis(valid);
const plan = [
  ["owed", 0],
  ["staged", 0],
  ["owed", 3.5],
  ["staged", 3.5],
  ["owed", 23.5],
  ["staged", 23.5],
] as const;
const windows = [];
try {
  for (const [index, [mode, rate]] of plan.entries()) {
    const baseline = await account.publish("baseline-" + index, W0.R1.doc, valid, "owed");
    const priorSeq = (await account.notices.observe()).value.sequence;
    const offered = clock() + (smoke ? 200 : rate ? 29000 : 200),
      cutoff = offered + 1000,
      windowStart = offered - (smoke ? 100 : rate ? 29000 : 0);
    const pending: Promise<unknown>[] = [];
    let tail = Promise.resolve(),
      failure: unknown;
    const rows: {
      seq: number;
      offered: number;
      entered: number;
      done: number;
      subject: number;
      p: number;
      tx: string;
      intent: string;
    }[] = [];
    const inOrder = <T>(go: () => Promise<T>) => {
      const actual = tail.then(async () => {
        if (failure) throw failure;
        return go();
      });
      tail = actual.then(
        () => {},
        (e) => {
          failure ??= e;
        },
      );
      return actual;
    };
    const subject = n - index - 1; // Distinct subjects for each first request.
    const probe = async () => {
      const started = clock(),
        observed = await reader.readAt(seeded.roster[subject]!, { validTime: valid });
      return { started, finished: clock(), ...observed };
    };
    const delays: number[] = [];
    if (rate)
      liveArrivals(0, rate, 60, (t) => {
        if (!smoke || t < 0.5) delays.push(t * 1000);
      });
    const traffic = (async () => {
      for (const at of delays) {
        const target = windowStart + at;
        await sleep(Math.max(0, target - clock()));
        const command = events[eventNumber++]!;
        assert(command);
        const go = inOrder(async () => {
          const entered = clock(),
            p = await store.head(),
            old = await rawDeep(store, command.subject, { tx: p, validTime: valid });
          const correct = authored(command.subject, p);
          compareSource(old, correct);
          const root = ids.placement(command.subject);
          const stamp = old.find((r) => r.entityId === root && r.attribute === ":placement/stamp");
          assert(stamp);
          const fields: Fact[] = [
            { e: root, a: ":placement/stamp", v: integer(Number(stamp.value.value) + 1) },
            ...liveEdits(command.subject, command.seq, command.kind, command.deep),
          ];
          if (command.correction)
            fields.push({
              e: ids.worker(command.subject),
              a: ":worker/address",
              v: string("correction-" + command.seq),
            });
          const ops = replaceDeep(old, fields, beforeMs);
          const r = await account.saveDeep("live-" + command.seq, command.subject, ops, valid);
          const next = authoredWrite(correct, fields, r.position, beforeMs);
          const bucket = tape.get(command.subject) ?? [];
          bucket.push({ p: r.position, rows: next });
          tape.set(command.subject, bucket);
          rows.push({
            seq: command.seq,
            offered: target,
            entered,
            done: clock(),
            subject: command.subject,
            p: r.position,
            tx: r.txId,
            intent: sha256(canonical(fields)),
          });
        });
        // Track errors and keep the intended offer schedule independent from the issuer and oracle.
        pending.push(
          go.catch((e) => {
            failure ??= e;
          }),
        );
      }
    })();
    const scheduledProbe = (async () => {
      while (clock() < cutoff) await sleep(Math.max(1, cutoff - clock()));
      return probe();
    })();
    await sleep(Math.max(0, offered - clock()));
    const ingress = clock();
    // [DX-ACT1] Why: author an unseen document on ingress and schedule the deadline read independently. Rejected: timing after compilation or making the deadline probe wait for the Publish ACK.
    const document = structuredClone(W0.R2.doc),
      days = [1, 2, 4, 5, 6, 7][index]!;
    Object.assign(document.rules.find((r) => r.id === "I9S2")!, { params: { businessDays: days } });
    save("offer-" + index, {
      index,
      mode,
      rate,
      offered,
      ingress,
      cutoff,
      document,
      request: "publish-" + index,
      nonce: attempt.nonce,
    });
    const reply = await inOrder(async () => {
      const entered = clock();
      const result = await measureW0Http(() =>
        account.publish("publish-" + index, document, valid, mode, undefined, {
          workers: 4,
          sources: "indexed",
        }),
      );
      const durable = store.counters.ackObserved;
      assert(durable >= entered && durable <= clock());
      return {
        r: result.value,
        entered,
        durable,
        stages: account.lastMaterial,
        wire: result.samples
          .filter((x) => String(x.path).endsWith("/transact"))
          .map((x) => Number(x.requestBytes)),
      };
    });
    const first = await probe();
    const deadline = await scheduledProbe;
    await traffic;
    await Promise.all(pending);
    if (failure) throw failure;
    assert(rows.length === delays.length && rows.every((r, i) => i === 0 || rows[i - 1]!.p < r.p));
    const final = await store.lookup("joined:publish-" + index);
    assert.deepEqual(final, reply.r);
    assert(
      reply.wire.length === reply.stages.stages + 1 &&
        reply.wire.every((b) => b > 0 && b <= 4 * 1024 * 1024),
    );
    const sequence = priorSeq + 1,
      physical = await account.physical(sequence),
      newer = W0.compileRelease(document);
    assert(
      physical.marker.release === newer.hash &&
        physical.marker.seq === sequence &&
        physical.marker.cut < reply.r.position,
    );
    assert(physical.marker.output.count > 0 || mode === "owed");
    for (const read of [first, deadline]) {
      const at = read.basis.tx;
      assert(at >= baseline.position);
      const release = at >= reply.r.position ? document : W0.R1.doc;
      const [oracle] = JSON.parse(
        await ref.oracle.call("check", {
          document: release,
          old: null,
          basis: read.basis,
          worlds: [expected(subject, at)],
          fold: false,
        }),
      );
      assert.equal(read.json, oracle.json);
    }
    assert(
      first.basis.tx >= reply.r.position &&
        first.started >= reply.durable &&
        deadline.started >= cutoff - 2,
    );
    // Track the response, notice-recipe and physical-value frontiers separately. A miss stays in the observation ledger.
    const result = {
      index,
      baseline: baseline.position,
      mode,
      rate,
      offered,
      ingress,
      entered: reply.entered,
      durable: reply.durable,
      offeredToDurableMs: reply.durable - offered,
      firstCorrectMs: first.finished - offered,
      noticeRecipeDurableMs: reply.durable - offered,
      individualOwedDurableMs: null,
      changedValuesDurableMs: mode === "staged" ? reply.durable - offered : null,
      deadline: { ...deadline, onRelease: deadline.basis.tx >= reply.r.position },
      first,
      request: reply.r.commandId,
      nativeTx: reply.r.txId,
      nativeCut: reply.r.position,
      sequence,
      roster: seeded.rosterHash,
      release: newer.hash,
      doc: document,
      wire: reply.wire,
      work: reply.stages,
      writes: rows,
      deadlineMiss:
        first.finished > cutoff || reply.durable > cutoff || deadline.basis.tx < reply.r.position,
    };
    save("window-" + index, result);
    windows.push(result);
  }
  let previous: W0.ReleaseDoc | null = null;
  for (const r of windows) {
    await ref.check(
      account,
      seeded.roster,
      (i) => expected(i, r.baseline),
      W0.R1.doc,
      { tx: r.baseline, validTime: valid },
      previous,
      undefined,
      true,
      false,
    );
    const owedBefore = ref.owed.length;
    const proof = await ref.check(
      account,
      seeded.roster,
      (i) => expected(i, r.nativeCut),
      r.doc,
      { tx: r.nativeCut, validTime: valid },
      W0.R1.doc,
      r.sequence,
      true,
      false,
    );
    assert(proof.count === n && proof.changes > 0 && proof.owed > owedBefore);
    save("proof-" + r.index, {
      ...proof,
      notices: proof.owed - owedBefore,
      release: r.release,
      tx: r.nativeTx,
      cut: r.nativeCut,
      nonce: attempt.nonce,
    });
    previous = r.doc;
  }
  // The recipient stays offline through the measured windows. Post-run ordered delivery verifies the already-bound debt.
  const sink = await openStore("lazy-join-recipient-" + attempt.nonce);
  try {
    const dispatch = account.dispatcher(new Documents(sink.comp, "recipient"));
    await dispatch.drain();
    save("server-effects", await ref.receiver(account, dispatch));
  } finally {
    await sink.close();
  }
  assert.equal(sha256(readFileSync(ownerPath)), attempt.owner);
  assert.equal(git("rev-parse", "HEAD"), source);
  for (const [f, h] of Object.entries({ ...pins, ...build }))
    assert.equal(sha256(readFileSync(f)), h, f);
  assert.equal(sha256(readFileSync(config)), configDigest);
  const outputs = Object.fromEntries(
    [
      "server-effects",
      ...(!smoke ? ["preflight/stage-gate", "preflight/idle-deadline"] : []),
      ...windows.flatMap((r) => ["offer-" + r.index, "window-" + r.index, "proof-" + r.index]),
    ].map((f) => [f, sha256(readFileSync(join(root, f + ".json")))]),
  );
  save("server-observations", {
    source,
    nonce: attempt.nonce,
    n,
    scope: store.scope,
    roster: seeded.rosterHash,
    inputs: sha256(readFileSync(join(root, "server-inputs.json"))),
    owner: attempt.owner,
    outputs,
    windows: windows.map((x) => ({
      index: x.index,
      rate: x.rate,
      mode: x.mode,
      deadlineMiss: x.deadlineMiss,
    })),
  });
} finally {
  ref.oracle.close();
  await readStore.close();
  await store.close();
}
