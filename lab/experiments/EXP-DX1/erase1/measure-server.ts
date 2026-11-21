import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import {
  DatomicClient,
  DatomicHttpError,
  orderedSaveIdentity,
} from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { launchProfile, type CreditMode } from "../jvm1/launch.mjs";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { readScaleJvms, scaleHost, startScaleStack } from "../scale1/bench.ts";
import { decodeFeed, now } from "../scale1/decision/observer.ts";
import { accounts, field, root, task, writeTape } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Row } from "../scale1/decision/writes.ts";
import { checkAdoptedPeer, hex, openScaleSeal } from "../v01/adopt.ts";
import { checkSavedIdentity, jsonFile, preload } from "../v01/adopted.ts";
import { stackOptions } from "../v01/profile.ts";
import { cleanSource, pgImage, verifyBuild } from "../v01/source.ts";
import { command } from "../w1/group/workload.ts";

const { values } = parseArgs({
  options: {
    help: { type: "boolean" },
    seed: { type: "string" },
    "image-sha256": { type: "string" },
    "transfer-sha256": { type: "string" },
    "pg-data": { type: "string" },
    commit: { type: "string" },
    out: { type: "string" },
    profile: { type: "string" },
    "credit-mode": { type: "string", default: "rolling6" },
  },
});
if (values.help) {
  console.log(
    "measure-server.ts --profile server --pg-data STOPPED_COPY --seed SEAL_DIR --image-sha256 SHA --transfer-sha256 SHA --commit COMMIT --out NEW_DIR [--credit-mode rolling6|barrier6]",
  );
  process.exit(0);
}
const { seed: sealDir, out, commit, profile } = values;
assert(sealDir && out && commit && profile === "server" && values["pg-data"]);
assert(values["image-sha256"] && values["transfer-sha256"]);
const policy = launchProfile(profile, { creditMode: values["credit-mode"] as CreditMode });
const source = cleanSource(commit);
scaleHost.physical();
verifyBuild(source, process.env.DX_V01_BUILD_RECEIPT);
const lock = "/var/tmp/triplex-bm1/dx-bm1-day.lock";
assert(
  fs.readdirSync("/proc/self/fdinfo").some((fd) => {
    try {
      const file = fs.statSync("/proc/self/fd/" + fd);
      const queue = fs.statSync(lock);
      return (
        file.dev === queue.dev &&
        file.ino === queue.ino &&
        /^lock:.*FLOCK.*WRITE/m.test(fs.readFileSync("/proc/self/fdinfo/" + fd, "utf8"))
      );
    } catch {
      return false;
    }
  }),
  "Acquire the server queue lock with flock --no-fork",
);
const docker = (...args: string[]) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 70_000 }).trim();
assert.equal(docker("ps", "-q"), "", "Another stack is running");

const pgData = fs.realpathSync(values["pg-data"]);
const outputDir = path.resolve(out);
assert(!outputDir.startsWith(pgData + path.sep) && outputDir !== pgData);
assert(fs.readFileSync(path.join(pgData, "PG_VERSION"), "utf8").trim() === "17");
assert(!fs.existsSync(path.join(pgData, "postmaster.pid")));
const seed = openScaleSeal(
  path.join(sealDir, "image.json"),
  values["image-sha256"],
  false,
  values["transfer-sha256"],
  "stopped-copy",
);
const db = seed.scope.db;
const attempt = randomUUID();
const stopStartingPhasesAt = now() + 72 * 60_000;
const slot = "tx2-dxscale1-removal-" + attempt.slice(0, 12);
const token = randomBytes(32).toString("hex");
const victims = accounts.at(-1)!;
const marked = ":removal-probe/protected-" + attempt;
const plain = ":removal-probe/control-" + attempt;
const fixedBasis = { recordedPosition: seed.scope.cut, validAt: SEED_VALID_FROM };
const q = (name: string, value: unknown) => jsonFile(path.join(outputDir, name + ".json"), value);

fs.mkdirSync(outputDir, { mode: 0o700 });
q("attempt", { tag: path.basename(outputDir), slot, attempt, source });
q("input", {
  attempt,
  slot,
  source,
  policy,
  image: seed.pin,
  transfer: seed.transferPin,
  initialControlSha256: hex(fs.readFileSync(path.join(pgData, "global", "pg_control"))),
  database: db,
  accounts: seed.scope.accounts,
  originalHead: seed.scope.cut,
  peoplePerAccount: seed.image.people,
  victims,
  marked,
});
assert(Object.values(scaleHost.childrenInventory(slot)).every((r) => r.length === 0));
let engines: ReturnType<typeof startScaleStack>["engines"] | undefined;
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
const clients: DatomicClient[] = [];
const connect = (address: string) => {
  const client = new DatomicClient(`http://${address}:8080`, 35_000);
  clients.push(client);
  return client;
};

type Erase = Awaited<ReturnType<DatomicClient["erase"]>>;
type Wire = Parameters<typeof decodeFeed>[1];
type Ack = {
  operationId: string;
  t: { v: string };
  position: { v: string };
  subjectSave?: string;
  subjectOrderedIds?: boolean;
  datoms?: number;
  nativeApplyMs?: number;
  recordedAt: { v: number };
};
const sameIds = (actual: readonly string[], expected: readonly string[]) =>
  assert.deepEqual([...actual].sort(), [...expected].sort());
const marker = (removal: Erase) => ({
  type: "erased",
  valueType: "string",
  erasedAt: removal.erasedAt,
  erasureTxId: removal.txId,
});

async function available<T>(read: () => Promise<T>): Promise<T> {
  const end = now() + 35_000;
  for (;;) {
    try {
      return await read();
    } catch (e) {
      if (
        stopping ||
        now() >= end ||
        !(e instanceof DatomicHttpError) ||
        e.code !== "ErasureFrontierUnavailable"
      )
        throw e;
      await sleep(10);
    }
  }
}

function latency(rows: number[]) {
  assert(rows.length > 0 && rows.every((x) => Number.isFinite(x) && x >= 0));
  const sorted = [...rows].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.ceil(p * sorted.length) - 1]!;
  return { samples: rows.length, p50: percentile(0.5), p99: percentile(0.99), max: sorted.at(-1)! };
}

async function measure(writer: DatomicClient, reader: DatomicClient, writeAddress: string) {
  const diag = async <T>(operation: string, input: object = {}): Promise<T> => {
    const response = await fetch(`http://${writeAddress}:8080/erase1/${operation}`, {
      headers: { "content-type": "application/json", "x-erase1-token": token },
      method: "POST",
      body: JSON.stringify({ ...input, scope: seed.key }),
      signal: AbortSignal.timeout(10 * 60_000),
    });
    assert(response.ok, `${operation} returned ${response.status}`);
    return (await response.json()) as T;
  };
  q("seed-readback", await checkAdoptedPeer(writer, seed, fixedBasis.recordedPosition));
  assert(!(await writer.erasureFrontier(db)).protected);
  // [DX-ERASE2] Why: only the drained benchmark stack can introduce this attempt's new field on the sealed seed.
  // Rejected: marking a field already written in clear or changing the product's declaration rules.
  assert.deepEqual(await diag("server-protection", { position: seed.scope.cut }), {
    database: db,
    attributes: [marked],
    sealed: true,
    erasure: { seq: 0 },
  });
  assert.deepEqual(await available(() => reader.erasureFrontier(db)), {
    database: db,
    protected: true,
    seq: 0,
    erased: {},
  });
  const opts = await writer.request<{ subjectFunction: string; subjectOrderedIds: boolean }>(
    "GET",
    `/v1/db/${db}/write-options`,
  );
  assert(
    opts.subjectOrderedIds && /^:triplex\.subject\/v-[a-f0-9]{24}$/.test(opts.subjectFunction),
  );

  let head = seed.scope.cut;
  let serial = 0;
  const save = async (owner: string, attribute: string, value: string, prior?: Row) => {
    const identity = orderedSaveIdentity();
    const commandId = "removal-measure/" + attempt + "/" + ++serial;
    const input = {
      ...command(
        commandId,
        [{ e: owner, a: attribute, v: { type: "string", value } }],
        prior ? [prior] : [],
        true,
        false,
        identity,
      ),
      live: prior ? [prior.id] : [],
    };
    input.sourceK = head;
    const start = now();
    const ack = (await writer.transact(db, {
      ...input,
      groupAccount: String(victims),
      writeClass: "live",
    })) as Ack;
    const ms = now() - start;
    assert.equal(ack.operationId, input.operationId);
    assert.equal(Number(ack.position.v), ++head);
    assert.equal(await writer.claim(db, commandId, head), identity.transactionId);
    const found = await writer.rows(db, {
      id: identity.assertionId(0),
      basis: { recordedPosition: head, validAt: SEED_VALID_FROM },
    });
    const [row] = found;
    assert.equal(found.length, 1);
    assert(row && row.recorded_position === head && row.recorded_at === ack.recordedAt.v);
    assert.deepEqual(
      [row.entity_id, row.attribute, row.value_string, row.tx_id],
      [owner, attribute, value, identity.transactionId],
    );
    if (prior)
      assert.deepEqual([ack.subjectSave, ack.subjectOrderedIds], [opts.subjectFunction, true]);
    return { row, ack, ms };
  };

  // [DX-ERASE2] Why: compare identical replacement frames with the protected block between two ordinary blocks.
  // Rejected: an insert/replace comparison or substituting client latency when the native counter is missing.
  const costs = [];
  for (const attribute of [plain, marked, plain]) {
    const samples: Awaited<ReturnType<typeof save>>[] = [];
    for (let i = 0; i < 104; i++) {
      const owner = task(victims, 200 + costs.length * 8 + (i % 4));
      const prior: Row | undefined = i >= 4 ? samples.at(i - 4)!.row : undefined;
      samples.push(await save(owner, attribute, hex(attempt + "/cost/" + i).slice(0, 40), prior));
    }
    const writes = samples.slice(4).map(({ row, ack, ms }) => ({
      id: row.id,
      position: row.recorded_position,
      t: ack.t.v,
      ms,
      nativeApplyMs: ack.nativeApplyMs ?? null,
      datoms: ack.datoms,
    }));
    const native = writes.flatMap((s) => (s.nativeApplyMs === null ? [] : [s.nativeApplyMs]));
    costs.push({
      writes,
      latency: latency(writes.map((s) => s.ms)),
      transactionApply: native.length === writes.length ? latency(native) : null,
    });
  }
  q("protected-save-cost", costs);

  const targets: { i: number; value: string; row: Row; t: string }[] = [];
  for (let i = 0; i < 100; i++) {
    const value = hex(attempt + "/target/" + i);
    const { row, ack } = await save(task(victims, i), marked, value);
    targets.push({ i, value, row, t: ack.t.v });
  }
  const first = targets[0]!;
  const pin = { recordedPosition: head, validAt: SEED_VALID_FROM };
  const selectors = targets.map(({ row }) => ({ entityId: row.entity_id, attribute: marked }));
  const wanted = targets.map(({ row }) => row.id);
  const pinnedRequest = {
    pattern: { attribute: marked },
    entityIds: targets.map(({ row }) => row.entity_id),
    basis: pin,
  };
  const before = await reader.rows(db, pinnedRequest);
  sameIds(
    before.map((row) => row.id),
    wanted,
  );
  for (const target of targets)
    assert.equal(before.find((x) => x.id === target.row.id)?.value_string, target.value);
  const warm = await reader.readDemandWorld(seed.key, root(victims, first.i), pin, false);
  assert.deepEqual(warm?.triples.find((r) => r.id === first.row.id)?.value, {
    type: "string",
    value: first.value,
  });

  const baseTape = writeTape(100_000, 235, 0).map((offer) => ({
    ...offer,
    account: offer.account === victims ? 1 + (offer.ordinal % (victims - 1)) : offer.account,
  }));
  assert(baseTape.length === 235 * 90 && baseTape.every((offer) => offer.account !== victims));
  const senders = await preload(writer, seed, head, baseTape);
  for (const sender of senders) sender.client = connect(writeAddress);
  let removal: Erase | undefined;
  const checkRoutes = async (receipt: Erase, handle: string, acknowledged: number) => {
    const markerBytes = marker(receipt);
    const readWitness = (rows: readonly Row[]) => {
      const row = rows.find((r) => r.id === first.row.id);
      assert(row && row.value_type === "erased" && row.value_string === null);
      assert.deepEqual(JSON.parse(row.value_json!), markerBytes);
      const { value_type: _type, value_string: _string, value_json: _json, ...observed } = row;
      const {
        value_type: _priorType,
        value_string: _priorString,
        value_json: _priorJson,
        ...original
      } = first.row;
      assert.deepEqual(observed, original);
    };
    const hasMarker = (data: Awaited<ReturnType<DatomicClient["readDemandWorld"]>>) => {
      assert(data);
      const row = data.triples.find((r) => r.id === first.row.id);
      assert(row);
      assert.deepEqual(row.value, markerBytes);
    };
    const basis = { recordedPosition: receipt.position, validAt: SEED_VALID_FROM };
    const entityIds = [first.row.entity_id];
    const rawJournal = () =>
      reader.rows(db, { entityIds: [first.row.tx_id], pattern: { attribute: ":_tx/change" } });
    const checkJournal = (rows: readonly Row[]) => {
      const change = rows
        .map((row) => JSON.parse(row.value_json!))
        .find((row) => row.tripleId === first.row.id);
      assert(change);
      assert.deepEqual(change.value, markerBytes);
    };
    const checkFeed = async () => {
      const page = await reader.log(db, receipt.t, 1);
      assert.equal(page.fromT, receipt.t);
      const event = page.rows[0];
      assert(event?.kind === "commit" && event.transaction.txIds.includes(receipt.txId));
      sameIds(
        event.transaction.changes.filter((c) => c.op === "erase").map((c) => c.assertionId),
        wanted,
      );
      assert.equal((await reader.log(db, page.nextT, 1)).fromT, page.nextT);
    };
    const checks: [string, () => Promise<void>][] = [
      ["current-writer", async () => readWitness(await writer.rows(db, { entityIds, basis }))],
      ["current-reader", async () => readWitness(await reader.rows(db, { entityIds, basis }))],
      ["pinned", async () => readWitness(await reader.rows(db, { entityIds, basis: pin }))],
      ["held-handle", async () => readWitness(await reader.rows(db, { entityIds, handle }))],
      [
        "entity-history",
        async () => readWitness(await reader.rows(db, { entityIds, history: true })),
      ],
      [
        "assertion-history",
        async () => readWitness(await reader.rows(db, { id: first.row.id, history: true })),
      ],
      [
        "batch-old-cut",
        async () => {
          const results = await reader.rows(db, pinnedRequest);
          sameIds(
            results.map((r) => r.id),
            wanted,
          );
          for (const r of results) {
            assert.equal(r.value_type, "erased");
            assert.equal(r.value_string, null);
            assert.deepEqual(JSON.parse(r.value_json!), markerBytes);
            const previous = targets.find((target) => target.row.id === r.id)!.row;
            assert.deepEqual(
              [
                r.entity_id,
                r.attribute,
                r.valid_from,
                r.valid_to,
                r.recorded_position,
                r.recorded_at,
                r.tx_id,
              ],
              [
                previous.entity_id,
                previous.attribute,
                previous.valid_from,
                previous.valid_to,
                previous.recorded_position,
                previous.recorded_at,
                previous.tx_id,
              ],
            );
          }
        },
      ],
      [
        "reach-pinned",
        async () =>
          hasMarker(await reader.readDemandWorld(seed.key, root(victims, first.i), pin, false)),
      ],
      [
        "reach-current",
        async () =>
          hasMarker(await reader.readDemandWorld(seed.key, root(victims, first.i), basis, false)),
      ],
      ["journal-rows", async () => checkJournal(await rawJournal())],
      [
        "journal-page",
        async () => {
          const { transactions } = await page(first.row.recorded_position - 1, 1);
          assert.deepEqual(transactions[0]!.slice(0, 2), [
            first.row.tx_id,
            first.row.recorded_position,
          ]);
          checkJournal(
            transactions[0]![2].map(decodeRowText).filter((row) => row.attribute === ":_tx/change"),
          );
        },
      ],
      ["feed-resume", checkFeed],
      [
        "protected-value-filter",
        async () => {
          await assert.rejects(
            reader.request("POST", `/v1/db/${db}/q`, {
              basis: pin,
              edn: `[:find ?e :in $ :where [?e ${marked} ${JSON.stringify(first.value)}]]`,
            }),
            (e) => e instanceof DatomicHttpError && e.code === "ErasureQueryUnsupported",
          );
        },
      ],
    ];
    const results = await Promise.allSettled(
      checks.map(async ([route, check]) => {
        await available(check);
        return { route, elapsedFromAcknowledgementMs: now() - acknowledged };
      }),
    );
    const observed = results.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : { route: checks[index]![0], error: String(result.reason) },
    );
    q("route-checks", {
      source,
      slot,
      attempt,
      removal: receipt.txId,
      seq: receipt.seq,
      assertion: first.row.id,
      count: wanted.length,
      expectedMarker: markerBytes,
      checks: observed,
    });
    assert(
      results.every((result) => result.status === "fulfilled"),
      "A live route did not verify its marker",
    );
    return observed;
  };

  function page(after: number, limit: number) {
    return reader.request<{ transactions: Wire[] }>("POST", `/v2/db/${db}/transactions`, {
      after,
      limit,
    });
  }

  type Interval = { start: number; end: number };
  type Phase = "baseline" | "removal" | "cleanup" | "after";
  const summaries = new Map<
    Phase,
    { quietSave: ReturnType<typeof latency>; quietRead: ReturnType<typeof latency> }
  >();
  for (const phase of ["baseline", "removal", "cleanup", "after"] as const) {
    assert(!stopping && now() < stopStartingPhasesAt);
    const held = phase === "removal" ? await reader.begin(db) : undefined;
    if (held) assert.equal(held.position, head);
    const base = now() + 1000;
    const from = head;
    const tape = baseTape.map((offer) => ({ ...offer, version: phase + "/" + offer.version }));
    const loaded = play(
      senders,
      tape,
      base,
      attempt,
      true,
      true,
      creditModeSelection(policy.creditMode),
      true,
    );
    const quiet = async () => {
      const samples: (Interval & { elapsed: number })[] = [];
      for (let n = 0; n < 450; n++) {
        if (stopping) break;
        await sleep(Math.max(0, base + n * 200 - now()));
        const start = now();
        const subject = (n * 7919) % seed.image.people;
        const owner = task(0, subject);
        const rows = await available(() =>
          reader.rows(db, {
            entityIds: [owner],
            pattern: { attribute: field(0) },
            basis: fixedBasis,
          }),
        );
        assert.equal(rows.length, 1);
        assert.deepEqual(
          [rows[0]!.entity_id, rows[0]!.value_string],
          [owner, fieldValue(subject, 0, 0, 0).value],
        );
        const end = now();
        samples.push({ start, end, elapsed: end - start });
      }
      return samples;
    };
    const activity = async (): Promise<Interval | undefined> => {
      if (phase === "baseline" || phase === "after") return;
      await sleep(Math.max(0, base + 20_000 - now()));
      assert(!stopping);
      const start = now();
      if (phase === "removal") {
        const commandId = "removal-batch/" + attempt;
        removal = await writer.erase(db, commandId, selectors);
        const acknowledged = now();
        assert(removal.seq === 1 && removal.position > from && BigInt(removal.t) > BigInt(first.t));
        sameIds(
          removal.identities.map((r) => r.assertionId),
          wanted,
        );
        assert(held);
        const routes = await checkRoutes(removal, held.handle, acknowledged);
        const end = now();
        assert.deepEqual(await writer.erase(db, commandId, selectors), removal);
        assert.equal(
          await available(() => reader.claim(db, commandId, removal!.position)),
          removal.txId,
        );
        q("removal", {
          source,
          slot,
          attempt,
          start,
          acknowledged,
          end,
          acknowledgementMs: acknowledged - start,
          allRoutesMs: end - start,
          routes,
          receipt: removal,
        });
        return { start, end };
      }
      assert(removal);
      // [DX-ERASE2] Why: include the exact pending body set in scheduled ordinary index work.
      // Rejected: forcing a separate build for the same range of ongoing writes.
      const cleanup = await diag<{
        ids: string[];
        matched: number;
        keysAbsent: number;
        seq: number;
        t: string;
        requestedIndex?: unknown;
      }>("ciphertext-cleanup", { ids: wanted, foldWithOrdinaryIndex: true });
      sameIds(cleanup.ids, wanted);
      assert(
        cleanup.seq === removal.seq &&
          cleanup.matched === wanted.length &&
          cleanup.keysAbsent === wanted.length,
      );
      assert.equal(cleanup.requestedIndex, undefined);
      assert(BigInt(cleanup.t) > BigInt(removal.t));
      const scheduled = await diag<{ t: number; basis: number; ms: number }>("index");
      assert(
        Number.isSafeInteger(scheduled.t) &&
          scheduled.basis >= scheduled.t &&
          BigInt(scheduled.t) >= BigInt(cleanup.t) &&
          Number.isFinite(scheduled.ms),
      );
      const verified = await diag<{ ids: string[]; t: string; finishedAt: number }>(
        "cleanup-barrier",
        { ids: wanted, t: cleanup.t },
      );
      sameIds(verified.ids, wanted);
      assert.equal(verified.t, cleanup.t);
      assert(Number.isFinite(verified.finishedAt));
      const end = now();
      const [read] = await available(() => reader.rows(db, { id: first.row.id, history: true }));
      assert(read && read.value_string === null);
      assert.deepEqual(JSON.parse(read.value_json!), marker(removal));
      q("cleanup-body-check", {
        source,
        slot,
        attempt,
        start,
        end,
        elapsedMs: end - start,
        cleanup,
        scheduled,
        verified,
      });
      return { start, end };
    };

    const [writes, reads, interference] = await Promise.allSettled([loaded, quiet(), activity()]);
    if (held) await reader.release(db, held.handle);
    if (reads.status === "fulfilled") q(phase + "-quiet-reads", reads.value);
    if (writes.status !== "fulfilled") throw writes.reason;
    await resolveUncertain(senders, writes.value.unresolved);
    q(phase + "-offers", writes.value.rows);
    if (reads.status !== "fulfilled") throw reads.reason;
    if (interference.status !== "fulfilled") throw interference.reason;
    head = Number((await writer.basis(db)).position.v);
    const pending = new Map(
      writes.value.rows.filter((s) => s.receipt).map((s) => [s.receipt!.p, s]),
    );
    assert.equal(writes.value.rows.length, 235 * 90);
    assert.equal(pending.size, writes.value.rows.filter((s) => s.receipt).length);
    let cursor = from;
    while (cursor < head) {
      const { transactions } = await page(cursor, 100);
      assert(transactions.length > 0);
      for (const entry of transactions) {
        assert.equal(entry[1], ++cursor);
        if (phase === "removal" && cursor === removal?.position) {
          assert.equal(entry[0], removal.txId);
          continue;
        }
        const save = pending.get(cursor);
        assert(save, "Unexpected durable operation in the timed phase");
        checkSavedIdentity(
          save,
          decodeFeed(db, entry, now(), true),
          "subject",
          opts.subjectFunction,
        );
        pending.delete(cursor);
      }
    }
    assert.equal(cursor, head);
    assert.equal(pending.size, 0);
    const quietWrites = writes.value.rows.filter((s) => s.account === 0);
    const acknowledged = writes.value.rows.filter((s) => s.receipt);
    const complete = acknowledged.filter((s) => s.account === 0);
    const phaseReads = reads.value;
    const window = interference.value;
    const ns = (s: { due: number; end?: number }) => s.end! - s.due;
    const tails = {
      quietSave: latency(complete.map(ns)),
      quietRead: latency(phaseReads.map((r) => r.elapsed)),
    };
    summaries.set(phase, tails);
    q(phase + "-summary", {
      source,
      slot,
      attempt,
      offered: writes.value.rows.length,
      durable: acknowledged.length,
      quietOffered: quietWrites.length,
      quietDurable: complete.length,
      ...tails,
      durableDuringOffers: acknowledged.filter((save) => save.end! <= base + 90_000).length,
      credits: policy.creditMode,
      window,
      windowQuietSaves:
        window && complete.filter((s) => s.end! >= window.start && s.due <= window.end).map(ns),
      windowQuietReads:
        window && phaseReads.filter((r) => r.end >= window.start && r.start <= window.end),
    });
    assert.equal(
      complete.length,
      quietWrites.length,
      "A quiet save did not reach a checked receipt",
    );
  }
  q("quiet-account-comparison", {
    source,
    slot,
    attempt,
    ratios: ["removal", "cleanup"].map((phase) => ({
      phase,
      controls: (["baseline", "after"] as const).map((control) => ({
        control,
        quietSaveP99:
          summaries.get(phase as Phase)!.quietSave.p99 / summaries.get(control)!.quietSave.p99,
        quietReadP99:
          summaries.get(phase as Phase)!.quietRead.p99 / summaries.get(control)!.quietRead.p99,
      })),
    })),
  });
}

try {
  const started = startScaleStack(
    outputDir,
    slot,
    source,
    false,
    {
      ...stackOptions("subject", attempt),
      DX_ERASE2_SCOPE: seed.key,
      DX_ERASE2_FIELD: marked,
      DX_ERASE_TOKEN: token,
      TRIPLEX_ERASURE_WRAPPING_KEY: randomBytes(32).toString("base64"),
    },
    { policy, pgData },
  );
  engines = started.engines;
  const write = engines["gw-w"]!,
    read = engines["gw-r"]!;
  q("jvms", readScaleJvms(path.join(outputDir, "jvm"), engines, policy));
  await measure(connect(write.address), connect(read.address), write.address);
} finally {
  for (const client of clients) client.close();
  try {
    if (engines) {
      // [DX-ERASE2] Why: stopping exact containers includes child JVMs and avoids a loopback listener being mistaken for our process.
      // Rejected: waiting on vendor script PIDs, which can exit before Java, or using a port refusal as the PostgreSQL stop proof.
      for (const role of ["gw-r", "gw-w", "tx", "pg"] as const) {
        const id: string = engines[role]!.id;
        docker("stop", "--time", "40", id);
        assert.equal(
          docker("inspect", "--format", "{{.State.Running}} {{.State.Pid}}", id),
          "false 0",
        );
      }
      assert.equal(docker("inspect", "--format", "{{.State.ExitCode}}", engines.pg!.id), "0");
      assert(!fs.existsSync(path.join(pgData, "postmaster.pid")));
      const control = docker(
        "run",
        "--rm",
        "--pull",
        "never",
        "--read-only",
        "--network",
        "none",
        "--name",
        slot + "-health",
        "--mount",
        `type=bind,src=${pgData},dst=/data,readonly`,
        "--entrypoint",
        "pg_controldata",
        pgImage,
        "/data",
      );
      assert.match(control, /^Database cluster state:\s+shut down$/m);
      q("shutdown", {
        source,
        slot,
        attempt,
        freshAt: now(),
        controlSha256: hex(control),
        stopped: Object.fromEntries(
          Object.entries(engines).map(([role, engine]) => [role, engine.id]),
        ),
      });
    }
  } finally {
    scaleHost.clean(outputDir, slot);
  }
}
