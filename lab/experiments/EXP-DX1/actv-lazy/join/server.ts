import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { W0, canonical, sha256, type WorldRow } from "../../../../bench/lib/w0-world.ts";
import { ids, subjectOf, type Fact } from "../../../../bench/lib/world.ts";
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
import { timings, verifyTimings } from "./observations.ts";
import { campaignBudgetMs, campaignCells, collect, format } from "./collect.ts";
import { AccountAdmission, type PublishObservation } from "./admission.ts";
import { liveGateway, run as checkAdmission } from "./admission-gate.ts";
import type { Tail } from "../../notify1/journal.ts";
import { settlementPrices } from "./settle-price.ts";

const [count, root, flag] = process.argv.slice(2),
  n = Number(count),
  receiptOnly = flag === "--receipt" || flag === "--receipt-local",
  smoke = flag === "--local" || flag === "--one-seed-local" || flag === "--receipt-local",
  oneSeed = receiptOnly || flag === "--one-seed" || flag === "--one-seed-local";
assert(flag === undefined || flag === "--settlement" || smoke || oneSeed);
const plan = campaignCells(oneSeed, receiptOnly);
assert(root && (smoke ? n >= 64 && n <= 1000 : process.platform === "linux" && n === 100000));
const ownerPath = process.env.TRIPLEX_LAB_SLOT_OWNER!,
  ownerBytes = readFileSync(ownerPath),
  owner = JSON.parse(ownerBytes.toString("utf8"));
assert(
  owner.mode === "exclusive" &&
    owner.endpoint === process.env.DATOMIC_URL &&
    owner.container &&
    owner.volume,
);
const produced = new Map<string, string>();
const save = (name: string, data: unknown) => {
  const bytes = JSON.stringify(data, null, 2) + "\n";
  writeFileSync(join(root, name + ".json"), bytes, {
    flag: "wx",
    flush: /^(?:offer|terminal)-/.test(name),
  });
  const digest = sha256(bytes);
  produced.set(name, digest);
  return digest;
};
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
const gatewayAttempt = oneSeed ? process.env.TX2_WRITE_OPTIONS_ATTEMPT : undefined;
if (oneSeed) assert(gatewayAttempt, "Supply the reserved gateway's write-options attempt");
const attempt = {
  format,
  issuedAt: Date.now(),
  source,
  nonce: randomUUID(),
  owner: sha256(ownerBytes),
  slot: owner.container,
  volume: owner.volume,
  n,
  smoke,
  settlement: flag === "--settlement",
  planned: plan,
  ...(oneSeed ? { oneSeed, workBudgetMs: campaignBudgetMs(receiptOnly), gatewayAttempt } : {}),
  ...(receiptOnly ? { receiptOnly } : {}),
  pins,
  build,
  config: configDigest,
};
save("server-inputs", attempt);
// [DX-ACT1] Why: the receipt campaign budgets the measured seed and ordered replay as part of one finite run. Rejected: using the earlier 83-minute budget (the actual seed alone needed 112 minutes).
const budget = oneSeed
  ? setTimeout(() => {
      save("server-budget-stop", {
        source,
        nonce: attempt.nonce,
        at: Date.now(),
        reason: "Joined campaign work budget expired",
      });
      process.exit(124);
    }, campaignBudgetMs(receiptOnly))
  : undefined;
budget?.unref();
if (!smoke) {
  const pre = join(root, "preflight");
  mkdirSync(pre);
  const gates = [
    "stage-gate.ts",
    "deadline-gate.ts",
    "future-gate.ts",
    "gate.ts",
    ...(attempt.settlement ? ["settle-gate.ts"] : []),
  ];
  for (const f of gates) {
    const remaining = 600000 - (Date.now() - attempt.issuedAt);
    assert(!oneSeed || remaining > 0, "Joined preflight exhausted its ten-minute budget");
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", new URL(f, import.meta.url).pathname, pre],
      {
        stdio: "inherit",
        timeout: oneSeed ? Math.min(180000, remaining) : 180000,
        env: attempt.settlement ? { ...process.env, DX_ACT1_W1_GATE: "1" } : process.env,
      },
    );
  }
  if (receiptOnly) {
    assert(gatewayAttempt);
    // [DX-ACT1] Why: each attempt's order gate uses a new database on the pinned gateway. Rejected: using the gateway nonce as the database name (a rerun could replay old command receipts).
    await checkAdmission(
      pre,
      { source, nonce: attempt.nonce, identity: attempt.owner },
      gatewayAttempt,
    );
  }
  if (oneSeed) {
    // [DX-ACT2] Why: run the exact scheduled one-seed producer and collector at 1,000 before starting the large seed. Rejected: a quiet preflight that never admits Publish behind an active save.
    const small = join(pre, "one-seed"),
      remaining = 600000 - (Date.now() - attempt.issuedAt);
    mkdirSync(small);
    try {
      assert(remaining > 0, "Joined preflight exhausted its ten-minute budget");
      execFileSync(
        process.execPath,
        [
          "--experimental-strip-types",
          import.meta.filename,
          "1000",
          small,
          receiptOnly ? "--receipt-local" : "--one-seed-local",
        ],
        { stdio: "inherit", timeout: remaining },
      );
    } catch (error) {
      save("server-preflight-stop", {
        source,
        nonce: attempt.nonce,
        reason: String(error),
      });
      throw error;
    }
  }
}
const store = await openStore("lazy-join-server-" + attempt.nonce, "act2-deep");
const readStore = await openStore(store.scope, "act2-deep", "read");
const ref = new Reference(oneSeed ? 4 : 1);
type Change = { p: number; rows: WorldRow[] };
const tape = new Map<number, Change[]>();
const clock = () => performance.now();
if (oneSeed) {
  assert(gatewayAttempt);
  save("server-native-options", await liveGateway(store.scope, gatewayAttempt));
}
const seeded = await seed(store, n, "default", oneSeed ? 2000 : 1500);
const account = new JoinedAccount(store, oneSeed ? new AccountAdmission("priority") : undefined),
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
const windows = [];
const seenReleases = new Set<string>();
try {
  for (const [index, [mode, rate]] of plan.entries()) {
    const baseline = await account.publish("baseline-" + index, W0.R1.doc, valid, "owed");
    const priorSeq = (await account.notices.observe()).value.sequence;
    const offered = clock() + (smoke ? 200 : rate ? 29000 : 200),
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
    const submit = <T>(go: () => Promise<T>) => (oneSeed ? go() : inOrder(go));
    const subject = n - index - 1; // Distinct subjects for each first request.
    const probe = async () => {
      const started = clock(),
        position = await readStore.head(),
        headObserved = clock(),
        observed = await reader.readAt(seeded.roster[subject]!, { position, validTime: valid });
      assert.equal(observed.basis.tx, position);
      return { started, headObserved, finished: clock(), ...observed };
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
        const go = submit(async () => {
          const entered = clock(),
            root = ids.placement(command.subject);
          const fields: Fact[] = [
            { e: root, a: ":placement/stamp", v: integer(command.seq + 1) },
            ...liveEdits(command.subject, command.seq, command.kind, command.deep),
          ];
          if (command.correction)
            fields.push({
              e: ids.worker(command.subject),
              a: ":worker/address",
              v: string("correction-" + command.seq),
            });
          let r;
          if (oneSeed) {
            r = await account.saveDeep(
              "live-" + command.seq,
              command.subject,
              { fields, from: beforeMs },
              valid,
            );
          } else {
            const p = await store.head(),
              old = await rawDeep(store, command.subject, { tx: p, validTime: valid });
            compareSource(old, authored(command.subject, p));
            const stamp = old.find(
              (x) => x.entityId === root && x.attribute === ":placement/stamp",
            );
            assert(stamp);
            fields[0] = { ...fields[0]!, v: integer(Number(stamp.value.value) + 1) };
            r = await account.saveDeep(
              "live-" + command.seq,
              command.subject,
              replaceDeep(old, fields, beforeMs),
              valid,
            );
          }
          const next = authoredWrite(
            authored(command.subject, r.position - 1),
            fields,
            r.position,
            beforeMs,
          );
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
    await sleep(Math.max(0, offered - clock()));
    const ingress = clock(),
      cutoff = (oneSeed ? offered : ingress) + 1000;
    // [DX-ACT1] Why: author an unseen document on ingress and schedule the deadline read independently. Rejected: timing after compilation or making the deadline probe wait for the Publish ACK.
    const document = structuredClone(W0.R2.doc),
      days = [1, 2, 4, 5, 6, 7][index]!;
    Object.assign(document.rules.find((r) => r.id === "I9S2")!, { params: { businessDays: days } });
    Object.assign(document.rules.find((r) => r.id === "OT")!, {
      params: { thresholdMinutes: 2411 + index },
    });
    const offer = {
      index,
      mode,
      rate,
      offered,
      ingress,
      cutoff,
      ...(oneSeed ? { deadlineFrom: "scheduled" as const } : {}),
      document,
      request: "publish-" + index,
      nonce: attempt.nonce,
    };
    const offerSha = save("offer-" + index, offer);
    const scheduledProbe = (async () => {
      while (clock() < cutoff) await sleep(Math.max(1, cutoff - clock()));
      const observed = await probe();
      save("deadline-" + index, { nonce: attempt.nonce, offerSha, observed });
      return observed;
    })();
    // [DX-ACT1] Why: supervise deadline sources even if the writer fails first. Rejected: dropping the offer on an unhandled observer rejection.
    void scheduledProbe.catch(() => {});
    const witnessIndices = [subject, n - index - 9, Math.floor(n / 2) - index];
    const witnessSubjects = witnessIndices.map((i) => seeded.roster[i]!);
    const nonceAtDeadline = randomUUID();
    const observeInNewProcess = promisify(execFile)(
      process.execPath,
      [
        "--experimental-strip-types",
        new URL("./read-witness.ts", import.meta.url).pathname,
        store.scope,
        "act2-deep",
        nonceAtDeadline,
        valid,
        "at-" + (performance.timeOrigin + cutoff),
        ...witnessSubjects,
      ],
      { encoding: "utf8", maxBuffer: 16 << 20, timeout: 120000 },
    );
    void observeInNewProcess.catch(() => {});
    let testedCut: number | undefined;
    try {
      const reply = await submit(async () => {
        const entered = clock(),
          observation: PublishObservation = { attempts: [] };
        const result = await measureW0Http(() =>
          account.publish("publish-" + index, document, valid, mode, undefined, {
            workers: 4,
            sources: "indexed",
            observation,
          }),
        );
        const receipt = store.counters.lastReceipt;
        const matched =
          receipt &&
          receipt.commandId === result.value.commandId &&
          receipt.txId === result.value.txId &&
          receipt.position === result.value.position;
        const durable = matched ? receipt.time : clock();
        assert(durable >= entered && durable <= clock());
        return {
          r: result.value,
          entered: observation.turn?.entered ?? entered,
          admission: observation,
          durable,
          durableClock: matched ? receipt.clock : "readback",
          stages: account.lastMaterial,
          wire: result.samples
            .filter((x) => String(x.path).endsWith("/transact"))
            .map((x) => Number(x.requestBytes)),
        };
      });
      const first = await probe();
      const deadline = await scheduledProbe;
      testedCut = deadline.basis.tx;
      await traffic;
      await Promise.all(pending);
      if (failure) throw failure;
      assert(
        rows.length === delays.length && rows.every((r, i) => i === 0 || rows[i - 1]!.p < r.p),
      );
      const final = await store.lookup("joined:publish-" + index);
      assert.deepEqual(final, reply.r);
      assert(
        reply.wire.length === reply.stages.stages + 1 &&
          reply.wire.every((b) => b > 0 && b <= 4 * 1024 * 1024),
      );
      const sequence = oneSeed
          ? (await account.db.get<Tail>("tail", reply.r.position)).value.sequence
          : priorSeq + 1,
        physical = await account.physical(sequence),
        newer = W0.compileRelease(document);
      assert(!W0.RELEASES_BY_HASH.has(newer.hash) && !seenReleases.has(newer.hash));
      seenReleases.add(newer.hash);
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
      const cold = JSON.parse((await observeInNewProcess).stdout);
      assert(
        cold.scope === store.scope && cold.nonce === nonceAtDeadline && cold.pid !== process.pid,
      );
      assert(Number.isSafeInteger(cold.position) && cold.position >= baseline.position);
      assert.equal(cold.reads.length, witnessSubjects.length);
      const oracleDeadline = JSON.parse(
        await ref.oracle.call("check", {
          document: cold.position >= reply.r.position ? document : W0.R1.doc,
          old: W0.R1.doc,
          basis: { tx: cold.position, validTime: valid },
          worlds: witnessIndices.map((i) => expected(i, cold.position)),
          fold: false,
        }),
      );
      for (const [i, read] of cold.reads.entries()) {
        assert.equal(read.subject, witnessSubjects[i]);
        assert.deepEqual(read.basis, { tx: cold.position, validTime: valid });
        assert.equal(read.json, oracleDeadline[i].json);
      }
      const points = [
        [subject, first.basis.tx],
        [subject, deadline.basis.tx],
        ...witnessIndices.map((i) => [i, cold.position]),
      ];
      const samples = [];
      for (const [person, cut] of points) {
        compareSource(
          await rawDeep(readStore, person, { tx: cut, validTime: valid }),
          authored(person, cut),
        );
        samples.push(expected(person, cut));
      }
      save("point-inputs-" + index, { nonce: attempt.nonce, baseline: W0.R1.doc, samples });
      const coldDeadline = {
        ...cold,
        started: cold.started - performance.timeOrigin,
        headObserved: cold.headObserved - performance.timeOrigin,
        finished: cold.finished - performance.timeOrigin,
        basis: { tx: cold.position, validTime: valid },
      };
      const witnessNonce = randomUUID();
      const currentCut = await store.head();
      // [DX-ACT1] Why: a process with no remembered results reopens the exact observed cut. Rejected: taking the new process's later head as evidence for the deadline.
      const child = await promisify(execFile)(
        process.execPath,
        [
          "--experimental-strip-types",
          new URL("./read-witness.ts", import.meta.url).pathname,
          store.scope,
          "act2-deep",
          witnessNonce,
          valid,
          String(testedCut),
          ...witnessSubjects,
        ],
        { encoding: "utf8", maxBuffer: 16 << 20, timeout: 120000 },
      );
      const witness = JSON.parse(child.stdout);
      assert(
        witness.scope === store.scope &&
          witness.nonce === witnessNonce &&
          witness.pid !== process.pid,
      );
      assert.equal(witness.reads.length, witnessSubjects.length);
      assert.equal(witness.current.length, witnessSubjects.length);
      const eligible = testedCut >= reply.r.position ? document : W0.R1.doc;
      const oracleReads = JSON.parse(
        await ref.oracle.call("check", {
          document: eligible,
          old: W0.R1.doc,
          basis: { tx: testedCut, validTime: valid },
          worlds: witnessIndices.map((i) => expected(i, testedCut!)),
          fold: false,
        }),
      );
      for (const [i, read] of witness.reads.entries()) {
        assert.equal(read.subject, witnessSubjects[i]);
        assert.deepEqual(read.basis, deadline.basis);
        assert.equal(read.json, oracleReads[i].json);
      }
      const oracleCurrent = JSON.parse(
        await ref.oracle.call("check", {
          document,
          old: W0.R1.doc,
          basis: { tx: currentCut, validTime: valid },
          worlds: witnessIndices.map((i) => expected(i, currentCut)),
          fold: false,
        }),
      );
      for (const [i, read] of witness.current.entries()) {
        assert.equal(read.subject, witnessSubjects[i]);
        assert.deepEqual(read.basis, { tx: currentCut, validTime: valid });
        assert.equal(read.json, oracleCurrent[i].json);
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
        durableClock: reply.durableClock,
        ...timings(offer, {
          entered: reply.entered,
          durable: reply.durable,
          nativeCut: reply.r.position,
          first,
          deadline,
          coldDeadline,
        }),
        coldDeadline,
        deadline: {
          ...deadline,
          onRelease: deadline.basis.tx >= reply.r.position,
          scheduleLagMs: deadline.started - cutoff,
        },
        freshWitness: {
          ...witness,
          deadlineChangedRows: oracleReads.map((r: { rows: unknown[] }) => r.rows.length),
          currentChangedRows: oracleCurrent.map((r: { rows: unknown[] }) => r.rows.length),
        },
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
        ...(oneSeed ? { admission: reply.admission } : {}),
        writes: rows,
      };
      save("window-" + index, result);
      save("terminal-" + index, {
        index,
        nonce: attempt.nonce,
        offerSha,
        status: "observed",
        cut: testedCut,
        nativeTx: result.nativeTx,
        deadlineMiss: result.deadlineMiss,
      });
      windows.push(result);
    } catch (error) {
      const [observed] = await Promise.allSettled([scheduledProbe, observeInNewProcess]);
      save("terminal-" + index, {
        index,
        nonce: attempt.nonce,
        offerSha,
        status: "error",
        cut: testedCut ?? (observed?.status === "fulfilled" ? observed.value.basis.tx : null),
        elapsed: clock() - offered,
        error: String(error),
      });
      await Promise.allSettled([traffic]);
      await Promise.allSettled(pending);
      throw error;
    }
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
    assert(
      proof.changedOwners === n && proof.changedRoster === seeded.rosterHash,
      "All-person edit must change the independently enrolled subjects",
    );
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
  const nativeSeed = createHash("sha256");
  let nativeFacts = 0;
  for (let start = 0; start < n; start += 32) {
    const people = Array.from({ length: Math.min(32, n - start) }, (_, i) => start + i);
    const rows = await store.rows(people.map(ids.placement), seeded.cut, valid);
    const group = new Map<number, WorldRow[]>();
    for (const row of rows) {
      const person = subjectOf(row.entityId);
      assert(person !== null && people.includes(person));
      const list = group.get(person) ?? [];
      list.push(row);
      group.set(person, list);
    }
    for (const person of people) {
      const actual = group.get(person)!;
      compareSource(actual, authoredSeed(person, seeded.seedPosition(person)));
      const sorted = actual
        .map((r) =>
          canonical([r.entityId, r.attribute, r.value, r.position, r.validFrom, r.validTo ?? null]),
        )
        .sort();
      nativeSeed.update(canonical(sorted) + "\n");
      nativeFacts += actual.length;
    }
  }
  assert.equal(nativeFacts, seeded.facts);
  save("server-seed", {
    nonce: attempt.nonce,
    n,
    roster: seeded.rosterHash,
    sources: seeded.sourceHash,
    facts: nativeFacts,
    nativeCut: seeded.cut,
    nativeSeed: nativeSeed.digest("hex"),
  });
  // The recipient stays offline through the measured windows. Post-run ordered delivery verifies the already-bound debt.
  const sink = await openStore("lazy-join-recipient-" + attempt.nonce);
  try {
    const dispatch = account.dispatcher(new Documents(sink.comp, "recipient"));
    await dispatch.drain();
    save("server-effects", await ref.receiver(account, dispatch));
    save("server-effect-bytes", ref.owed);
  } finally {
    await sink.close();
  }
  assert.equal(sha256(readFileSync(ownerPath)), attempt.owner);
  assert.equal(git("rev-parse", "HEAD"), source);
  for (const [f, h] of Object.entries({ ...pins, ...build }))
    assert.equal(sha256(readFileSync(f)), h, f);
  assert.equal(sha256(readFileSync(config)), configDigest);
  // [DX-ACT1] Why: seal the exact observation bytes produced from fresh native replies. Rejected: accepting an edited timing field by hashing whatever is on disk at the end.
  for (const [name, digest] of produced)
    assert.equal(sha256(readFileSync(join(root, name + ".json"))), digest, name);
  for (const window of windows) {
    const read = (name: string) =>
      JSON.parse(readFileSync(join(root, name + "-" + window.index + ".json"), "utf8"));
    const terminal = read("terminal"),
      offer = read("offer"),
      report = read("window");
    assert(
      terminal.status === "observed" &&
        terminal.nonce === offer.nonce &&
        terminal.nativeTx === report.nativeTx,
    );
    assert.equal(terminal.offerSha, produced.get("offer-" + window.index));
    verifyTimings(offer, report);
  }
  const outputs = Object.fromEntries(
    [
      "server-effects",
      "server-effect-bytes",
      "server-seed",
      ...(oneSeed ? ["server-native-options"] : []),
      ...(oneSeed && !smoke ? ["preflight/one-seed/server-collected"] : []),
      ...(receiptOnly && !smoke ? ["preflight/joined-admission"] : []),
      ...(!smoke
        ? [
            "preflight/stage-gate",
            "preflight/idle-deadline",
            "preflight/future-gate",
            "preflight/joined-gate",
          ]
        : []),
      ...(attempt.settlement ? ["preflight/settle-gate"] : []),
      ...windows.flatMap((r) => [
        "offer-" + r.index,
        "terminal-" + r.index,
        "window-" + r.index,
        "proof-" + r.index,
        "deadline-" + r.index,
        "point-inputs-" + r.index,
      ]),
    ].map((f) => [f, sha256(readFileSync(join(root, f + ".json")))]),
  );
  save("server-observations", {
    format,
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
  save("server-collected", await collect(root, { source, owner: attempt.owner, n }));
  if (flag === "--settlement") {
    const extra = join(root, "settlement");
    mkdirSync(extra);
    await settlementPrices(extra, n, 60, 64);
  }
} catch (error) {
  save("server-stop", {
    source,
    nonce: attempt.nonce,
    error: String(error),
    unoffered: plan.flatMap((_, i) => (produced.has("offer-" + i) ? [] : [i])),
    unmatched: plan.flatMap((_, i) =>
      produced.has("offer-" + i) && !produced.has("terminal-" + i) ? [i] : [],
    ),
  });
  throw error;
} finally {
  clearTimeout(budget);
  ref.close();
  await readStore.close();
  await store.close();
}
