import assert from "node:assert/strict";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, DatomicTransportError } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM, type Fact } from "../../../bench/lib/world.ts";
import type { CreditMode } from "../jvm1/launch.mjs";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { now } from "../scale1/decision/observer.ts";
import {
  accounts,
  cellSeconds,
  field,
  sha,
  task,
  writeTape,
  type Density,
  type Write,
} from "../scale1/decision/plan.ts";
import {
  expectedJournal,
  play,
  resolveUncertain,
  type FairImport,
  type Row,
} from "../scale1/decision/writes.ts";
import { checkAdoptedPeer, type AdoptedSeed } from "../v01/adopt.ts";
import { checkSavedIdentity, feeder, jsonFile, preload, type Peer } from "../v01/adopted.ts";
import { command } from "../w1/group/workload.ts";

const deepFacts = 16_000_000;
type Cell = "quiet" | "control" | "import";
export type ImportPolicy = "fair" | "yield";
type Arm = { mode: CreditMode; width: number; label: string; yieldToLive: boolean };

// [DX-LOAD2] Why: the yield arms keep one matched quiet/control/import triple per frame width on one copy.
// Rejected: comparing a yield arm against another arm's baseline taken earlier on a smaller database.
export function fairArms(rolling: CreditMode, widths: readonly number[], policy: ImportPolicy, suffix = ""): Arm[] {
  assert(/^(?:-mi[0-9]+[mg]|-c32)?$/.test(suffix) && (suffix === "" || policy === "yield"));
  assert(widths.length >= 1 && new Set(widths).size === widths.length);
  for (const width of widths) importFrame("validation", width, 0);
  if (policy === "fair") {
    assert.equal(widths.length, 1);
    return [rolling, "barrier6" as const].map((mode) => ({
      mode, width: widths[0]!, label: mode, yieldToLive: false,
    }));
  }
  return widths.map((width) => ({
    mode: rolling, width, label: rolling + "-yield" + width + suffix, yieldToLive: true,
  }));
}
type Receipt = Awaited<ReturnType<DatomicClient["transactCommand"]>>;
type ImportFrame = {
  index: number;
  entity: string;
  facts: Fact[];
  input: ReturnType<typeof command>;
};
type FrameStage = {
  transactMicros?: number;
  nativeComputeMs?: number;
  nativeIoStats?: unknown;
  timeline?: Record<string, number>;
  datoms?: number;
};
type Imported = Parameters<FairImport["send"]>[0] & {
  stage?: FrameStage;
  index: number;
  receipt: Receipt;
  holdMs: number;
};

export function importFrame(stream: string, width: number, index: number): ImportFrame {
  assert(Number.isInteger(width) && width >= 8 && width <= 64);
  assert(Number.isInteger(index) && index >= 0 && (index + 1) * width <= deepFacts);
  // [DX-HA1] Why: independent immutable subjects let retry of any frame reproduce the same bytes.
  // Rejected: using the attempt clock or a mutable cursor as the fact identity.
  const id = "fair-" + sha([stream, width, index]);
  const entity = "acct/fair-" + stream + "/subject-" + index;
  const facts: Fact[] = Array.from({ length: width }, (_, i) => ({
    e: entity,
    a: ":import/field-" + i,
    v: i === 0 ? { type: "ref", value: entity } : { type: "string", value: id + "/" + i },
  }));
  return {
    index,
    entity,
    facts,
    input: {
      ...command(id, facts),
      writeClass: "import",
      clientId: "fair-" + stream,
      sendSequence: index + 1,
    },
  };
}

function tapeFor(people: Density, seconds: number, toy: boolean, toyBusy = 9) {
  const quietPeriod = cellSeconds(3.5);
  const quiet = Array.from({ length: Math.ceil(seconds / quietPeriod) }, (_, i) =>
    writeTape(people, 3.5, i).map((write) => ({ ...write, ms: write.ms + i * quietPeriod * 1000 })),
  )
    .flat()
    .filter((write) => write.ms < seconds * 1000);
  const live = Array.from({ length: Math.ceil(seconds / 90) }, (_, i) => writeTape(people, 394, i));
  const busyCount = (toy ? toyBusy : 235) * seconds;
  return [
    ...quiet.map((write) => ({ ...write, version: "q/" + write.version })),
    ...accounts.slice(1).flatMap((account) => {
      const count = Math.floor((busyCount + accounts.length - 1 - account) / (accounts.length - 1));
      const result: Write[] = [];
      for (const chunk of live) {
        const source = chunk.filter((write) => write.account === account);
        for (const [i, write] of source.entries()) {
          const index = result.length;
          if (index >= count) return result;
          const jitter = (write.ms * source.length) / (cellSeconds(394) * 1000) - i;
          result.push({
            ...write,
            ordinal: index,
            ms: ((index + jitter) * seconds * 1000) / count,
            version: "b/" + account + "/" + index,
          });
        }
      }
      assert.equal(result.length, count);
      return result;
    }),
  ].sort((a, b) => a.ms - b.ms);
}

type Read = { account: number; ordinal: number; due: number; ms?: number; error?: string };
async function readTape(
  client: DatomicClient,
  seed: AdoptedSeed,
  start: number,
  seconds: number,
  cell: Cell,
  toy: boolean,
) {
  const rate = toy ? 2 : 6;
  const reads: Read[] = [];
  const pending = new Set<Promise<void>>();
  const roster = cell === "quiet" ? [0] : accounts;
  const basis = { recordedPosition: seed.scope.seedCut, validAt: SEED_VALID_FROM };
  for (let i = 0; i < rate * seconds; i++) {
    for (const account of roster) {
      const due = start + ((i + account / accounts.length) * 1000) / rate;
      while (now() < due) await sleep(Math.max(1, due - now()));
      const row: Read = { account, ordinal: i, due };
      reads.push(row);
      if (pending.size >= 64) {
        row.error = "reader window full";
        continue;
      }
      const subject = (7919 * i + 101 * account) % seed.image.people;
      const entity = task(account, subject);
      const request = client
        .rows(seed.scope.db, { entityIds: [entity], pattern: { attribute: field(0) }, basis })
        .then((rows) => {
          assert.equal(rows.length, 1);
          const actual = rows[0]!;
          assert.deepEqual(
            [actual.entity_id, actual.attribute, actual.value_string],
            [entity, field(0), fieldValue(subject, 0, 0, 0).value],
          );
          assert(
            actual.recorded_position > 0 && actual.recorded_position <= basis.recordedPosition,
          );
          row.ms = now() - due;
        })
        .catch((error) => {
          row.error = String(error);
        })
        .finally(() => {
          pending.delete(request);
        });
      pending.add(request);
    }
  }
  await Promise.all(pending);
  return reads;
}

const stats = (values: number[]) => {
  values.sort((a, b) => a - b);
  return { count: values.length, p99Ms: values[Math.ceil(values.length * 0.99) - 1] ?? null };
};

const cutOf = async (client: DatomicClient, db: string) => {
  const dbAt = await client.begin(db);
  await client.release(db, dbAt.handle);
  return dbAt.position;
};

async function verifyRows(
  client: DatomicClient,
  db: string,
  terminal: number,
  stream: string,
  width: number,
  imported: Imported[],
) {
  // [DX-HA1] Why: verify the business rows independently at a pinned cut, in bounded requests.
  // Rejected: treating a journal entry or receipt alone as proof that its rows are queryable.
  let offset = 0;
  const check = async () => {
    while (offset < imported.length) {
      const entries = imported.slice(offset, offset + 24);
      offset += entries.length;
      const expected = new Map<string, Row>();
      const frames = entries.map(({ index, receipt }) => {
        const frame = importFrame(stream, width, index);
        for (const row of frame.input.rows.slice(0, width))
          expected.set(row.id, {
            ...row,
            recorded_position: receipt.position,
            recorded_at: receipt.recordedAt,
          });
        return frame;
      });
      const rows = await client.rows(db, {
        entityIds: frames.map((f) => f.entity),
        basis: { recordedPosition: terminal, validAt: SEED_VALID_FROM },
      });
      assert.equal(rows.length, expected.size);
      for (const row of rows) {
        assert.deepEqual(row, expected.get(row.id));
        expected.delete(row.id);
      }
      assert.equal(expected.size, 0);
    }
  };
  await Promise.all(Array.from({ length: 6 }, check));
}

async function checkReceipt(client: DatomicClient, db: string, receipt: Receipt) {
  const op = await client.operation(db, receipt.operationId);
  assert.deepEqual(
    [op.status, op.operationId, Number(op.position?.v), op.t?.v, op.recordedAt?.v],
    ["committed", receipt.operationId, receipt.position, receipt.t, receipt.recordedAt],
  );
  assert.equal(await client.claim(db, receipt.commandId, receipt.position), receipt.txId);
}

async function arm(
  out: string,
  source: string,
  peer: Peer,
  seed: AdoptedSeed,
  { mode, width, label, yieldToLive }: Arm,
  cell: Cell,
  head: number,
  seconds: number,
  limit: number,
  toy: boolean,
  toyBusy: number,
) {
  const write = new DatomicClient(peer.write, 35_000);
  const bulk = new DatomicClient(peer.write, 35_000);
  const read = new DatomicClient(peer.read, 35_000);
  const journal = new DatomicClient(peer.read, 35_000);
  const db = seed.scope.db;
  const admission = creditModeSelection(mode);
  const stream = sha(
    yieldToLive
      ? [source, seed.pin, db, peer.attempt, mode, cell, width, label]
      : [source, seed.pin, db, peer.attempt, mode, cell, width],
  ).slice(0, 32);
  const tape = tapeFor(seed.image.people as Density, seconds, toy, toyBusy).filter(
    (row) => cell !== "quiet" || !row.account,
  );
  let terminal: number | undefined;
  let cursor = 0;
  let active = 0;
  let peak = 0;
  let discarded = false;
  const imported: Imported[] = [];
  const file = path.join(out, label + "-" + cell);
  jsonFile(file + "-input.json", {
    source,
    slot: peer.slot,
    attempt: peer.attempt,
    gateway: peer.gatewaySource,
    seed: seed.pin,
    db,
    head,
    stream,
    seconds,
    width,
    limit,
    mode,
    label,
    yieldToLive,
    cell,
    tape: sha(tape),
    timing: toy ? "diagnostic" : "bare-metal",
  });
  try {
    const opened = await write.create(seed.key, "lean", true, 35_000);
    assert(
      !opened.created && opened.db === db && opened.strictRecordClocks && opened.orderedRowTexts,
    );
    assert.deepEqual(await bulk.create(seed.key, "lean", true, 35_000), opened);
    const options = await write.request<{
      attempt: string;
      database: string;
      position: number;
      gatewaySourceHash: string;
      subjectSave: boolean;
      subjectOrderedIds: boolean;
      subjectFunction: string;
      options: { groupCommit: boolean };
    }>("GET", "/v1/db/" + db + "/write-options");
    assert.deepEqual(
      [
        options.attempt,
        options.database,
        options.position,
        options.gatewaySourceHash,
        options.subjectSave,
        options.subjectOrderedIds,
        options.options.groupCommit,
      ],
      [peer.attempt, db, head, peer.gatewaySource, true, true, false],
    );
    assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
    const senders = await preload(write, seed, head, tape);
    const start = now() + 1000;
    const end = start + seconds * 1000;
    const following = feeder(journal, db, head, end + 120_000, () => terminal, true);
    void following.catch(() => {});
    // [DX-LOAD2] Why: keep each frame's own gateway and native timings (apply, I/O counters) beside its receipt,
    // so a frame's apply can be read against the time since the last index adoption.
    // Rejected: a second request per frame, or deriving frame reads from timing alone as on 2026-11-21.
    const stages = new Map<string, FrameStage>();
    {
      const transact = bulk.transact.bind(bulk);
      bulk.transact = async (...args) => {
        const ack = (await transact(...args)) as FrameStage & { operationId?: string };
        if (typeof ack?.operationId === "string") {
          const { transactMicros, nativeComputeMs, nativeIoStats, timeline, datoms } = ack;
          stages.set(ack.operationId, { transactMicros, nativeComputeMs, nativeIoStats, timeline, datoms });
        }
        return ack as Awaited<ReturnType<typeof transact>>;
      };
    }
    if (toy && cell === "import") {
      const transact = bulk.transact.bind(bulk);
      bulk.transact = async (...args) => {
        const ack = await transact(...args);
        if (!discarded) {
          discarded = true;
          throw new DatomicTransportError("Diagnostic discarded durable response");
        }
        return ack;
      };
    }
    const producer: FairImport = {
      limit,
      end,
      yieldToLive,
      ready: () => cell === "import" && (cursor + 1) * width <= deepFacts,
      async send(grant) {
        const frame = importFrame(stream, width, cursor++);
        peak = Math.max(peak, ++active);
        try {
          const receipt = await bulk.transactCommand(db, frame.input);
          assert.equal(receipt.operationId, frame.input.operationId);
          assert.equal(receipt.txId, frame.input.claims[0]!.txId);
          assert(receipt.position > head);
          const stage = stages.get(frame.input.operationId);
          stages.delete(frame.input.operationId);
          imported.push({ ...grant, index: frame.index, receipt, holdMs: now() - grant.at, ...(stage ? { stage } : {}) });
        } finally {
          active--;
        }
      },
    };
    const [writes, reads] = await Promise.all([
      play(
        senders,
        tape.map((row) => ({ ...row, version: stream + "/" + row.version })),
        start,
        stream,
        false,
        true,
        admission,
        undefined,
        false,
        undefined,
        producer,
      ),
      readTape(read, seed, start, seconds, cell, toy),
    ]);
    await resolveUncertain(senders, writes.unresolved);
    terminal = await cutOf(write, db);
    const feed = await following;
    const byPosition = new Map(feed.map((r) => [r.position, r]));
    for (const row of writes.rows) {
      if (!row.receipt) continue;
      checkSavedIdentity(row, byPosition.get(row.receipt.p)!, "per-person-ordered", options.subjectFunction);
      assert(byPosition.delete(row.receipt.p));
    }
    let previousImport = head;
    for (const { index, receipt, neighboursAhead } of imported.toSorted(
      (a, b) => a.index - b.index,
    )) {
      const frame = importFrame(stream, width, index);
      const actual = byPosition.get(receipt.position);
      assert(actual);
      assert.deepEqual(
        [actual.db, actual.id, actual.tx, actual.position, actual.clock, actual.digest],
        [
          db,
          receipt.commandId,
          receipt.txId,
          receipt.position,
          receipt.recordedAt,
          expectedJournal(frame, receipt.recordedAt),
        ],
      );
      assert(byPosition.delete(receipt.position));
      assert(
        receipt.position > previousImport,
        "Import frames reached the journal out of source order",
      );
      previousImport = receipt.position;
      if (admission.mode === "rolling") assert(neighboursAhead! < admission.credits - 1);
    }
    // [DX-LOAD2] Why: prove from the grants themselves that no frame was admitted beside a waiting live save.
    if (yieldToLive) assert(imported.every((f) => f.liveQueued === 0), "Import admitted beside waiting live saves");
    const framesWithStage = imported.filter((f) => f.stage?.transactMicros !== undefined).length;
    // [DX-LOAD2] Why: a toy gate passes only if it exercised both the yield and the grant path.
    if (toy && yieldToLive && cell === "import")
      assert((producer.yieldedChecks ?? 0) > 0, "The toy live tape never made the importer yield");
    assert.equal(writes.rows.length, tape.length);
    assert.equal(byPosition.size, 0, "Unattributed commits in the measured suffix");
    assert.equal(imported.length, cursor);
    assert(peak <= limit);
    if (toy && cell === "import") assert.equal(peak, limit);
    assert.equal(cell === "import", imported.length > 0);
    await verifyRows(read, db, terminal, stream, width, imported);
    if (toy && cell === "import") {
      assert(discarded);
      const first = imported.find((f) => f.index === 0)!;
      await checkReceipt(read, db, first.receipt);
      const retried = await write.transactCommand(db, importFrame(stream, width, 0).input);
      assert.deepEqual(retried, first.receipt);
      assert.equal(await cutOf(write, db), terminal);
    }
    const visible = new Map(feed.map((r) => [r.position, r.seen]));
    const windows = [
      [0, seconds],
      [0, seconds / 2],
      [seconds / 2, seconds],
    ].map(([from, until]) => {
      const inWindow = (time: number) =>
        time >= start + from! * 1000 && time < start + until! * 1000;
      const queryable =
        imported.filter((entry) => inWindow(visible.get(entry.receipt.position)!)).length * width;
      return {
        from,
        until,
        queryable,
        factsPerSecond: queryable / (until! - from!),
        accounts: accounts
          .filter((a) => cell !== "quiet" || !a)
          .map((account) => {
            const saves = writes.rows.filter((r) => r.account === account && inWindow(r.due));
            const probes = reads.filter((r) => r.account === account && inWindow(r.due));
            return {
              account,
              offeredSaves: saves.length,
              offeredReads: probes.length,
              save: stats(
                saves.flatMap((r) => (r.receipt && r.end !== undefined ? [r.end - r.due] : [])),
              ),
              read: stats(probes.flatMap((r) => (r.ms === undefined ? [] : [r.ms]))),
            };
          }),
      };
    });
    const result = {
      mode,
      label,
      width,
      yieldToLive,
      yieldedChecks: producer.yieldedChecks ?? 0,
      importGrantsBesideLiveQueue: imported.filter((f) => f.liveQueued > 0).length,
      framesWithStage,
      cell,
      start,
      end,
      head,
      terminal,
      peak,
      facts: cursor * width,
      discarded,
      hold: stats(imported.map((f) => f.holdMs)),
      windows,
    };
    jsonFile(file + "-raw.json", {
      imported,
      feed: feed.map(({ journalIds, ...r }) => r),
      saves: writes.rows,
      reads,
    });
    jsonFile(file + ".json", result);
    return result;
  } finally {
    [write, bulk, read, journal].forEach((c) => c.close());
  }
}

const ratio = (actual: number | null, control: number | null) =>
  actual !== null && control !== null && control > 0 ? actual / control : null;

export async function runFair(
  out: string,
  source: string,
  peer: Peer,
  seed: AdoptedSeed,
  rolling: CreditMode,
  widths: number | readonly number[],
  limit: number,
  toy = false,
  policy: ImportPolicy = "fair",
  toyBusy = 9,
  suffix = "",
  quietCell = true,
) {
  assert(/^rolling(?:6|8|12|16)$/.test(rolling));
  assert(Number.isInteger(limit) && limit >= 1 && limit <= 5);
  assert(Number.isInteger(toyBusy) && toyBusy >= 9 && toyBusy <= 235 && (toy || toyBusy === 9));
  const arms = fairArms(rolling, typeof widths === "number" ? [widths] : widths, policy, suffix);
  const client = new DatomicClient(peer.read, 35_000);
  try {
    await checkAdoptedPeer(client, seed, seed.scope.cut);
  } finally {
    client.close();
  }
  let head = seed.scope.cut;
  for (const spec of arms) {
    const seconds = toy ? 6 : 300;
    // [DX-LOAD2] Why: a 40-minute slot fits one control and one import cell; the quiet account's bar uses its control.
    // Rejected: dropping the matched control (every ratio needs a baseline on the same copy and memory).
    const alone = quietCell
      ? await arm(out, source, peer, seed, spec, "quiet", head, seconds, limit, toy, toyBusy)
      : undefined;
    const control = await arm(out, source, peer, seed, spec, "control", alone?.terminal ?? head, seconds, limit, toy, toyBusy);
    const loaded = await arm(out, source, peer, seed, spec, "import", control.terminal, seconds, limit, toy, toyBusy);
    head = loaded.terminal;
    const summary = loaded.windows.map((window, i) => ({
      from: window.from,
      until: window.until,
      queryableFacts: window.queryable,
      factsPerSecond: window.factsPerSecond,
      quietAlone: alone?.windows[i]!.accounts[0] ?? null,
      accounts: window.accounts.map((account, a) => {
        const baseline = control.windows[i]!.accounts[a]!;
        assert.equal(account.account, baseline.account);
        assert.equal(account.offeredSaves, baseline.offeredSaves);
        assert.equal(account.offeredReads, baseline.offeredReads);
        return {
          ...account,
          baseline,
          saveRatio: ratio(account.save.p99Ms, baseline.save.p99Ms),
          readRatio: ratio(account.read.p99Ms, baseline.read.p99Ms),
          quietSaveAtMost50ms: a === 0 && account.save.p99Ms !== null && account.save.p99Ms <= 50,
        };
      }),
    }));
    jsonFile(path.join(out, spec.label + "-comparison.json"), {
      source,
      slot: peer.slot,
      attempt: peer.attempt,
      db: seed.scope.db,
      seed: seed.pin,
      mode: spec.mode,
      label: spec.label,
      policy,
      yieldToLive: spec.yieldToLive,
      width: spec.width,
      limit,
      head,
      timing: toy ? "diagnostic" : "bare-metal",
      yieldedChecks: loaded.yieldedChecks,
      importGrantsBesideLiveQueue: loaded.importGrantsBesideLiveQueue,
      summary,
    });
    if (toy) {
      for (const cell of [alone, control, loaded].filter((c) => c !== undefined))
        for (const window of cell.windows)
          for (const account of window.accounts) {
            assert.equal(account.save.count, account.offeredSaves);
            assert.equal(account.read.count, account.offeredReads);
          }
    }
  }
  return {
    database: seed.scope.db,
    head,
    seed: seed.pin,
    widths: arms.map((a) => a.width),
    limit,
    rolling,
    policy,
    arms: arms.map((a) => a.label),
  };
}
