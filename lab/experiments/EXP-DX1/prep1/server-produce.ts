import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, DatomicHttpError } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText, encodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { ids, type Fact } from "../../../bench/lib/world.ts";
import { FairTurns } from "./fair-turns.ts";
import { checkJournal } from "../w1/field/journal.ts";
import { accounts, pooledDigest } from "../w1/group/population.ts";
import { command, seedPooled } from "../w1/group/workload.ts";
import { arms, cells, operation, prediction, seconds, type Arm } from "./server-tape.ts";

type Input = Parameters<DatomicClient["transact"]>[1];
type Row = Input["rows"][number];
type Ack = {
  operationId: string;
  t: { v: string };
  position: { v: string };
  recordedAt: { v: number };
  txn?: unknown;
  subjectSave?: string;
  subjectReplan?: boolean;
  nativeComputeMs?: number;
  nativeIoStats?: unknown;
  timeline: Record<string, number>;
  writePath: { function: string };
};
type Seed = {
  scope: string;
  db: string;
  head: number;
  facts: number;
  roster: string;
  fields: [string, Row[]][];
  seeds: Awaited<ReturnType<typeof seedPooled>>["seeds"];
};
const answer = ":field/answer-prep1",
  note = ":field/note";
const requestedCredits = Number(process.env.DX_PREP1_FAIR_CREDITS ?? 0);
assert([0, 1, 2, 6].includes(requestedCredits));
const root = (a: number, p: number) => ids.placement(accounts[a]!.first + p);
const fact = (e: string, a: string, value: string): Fact => ({
  e,
  a,
  v: { type: "string", value },
});
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
function load<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8"));
}
function save(file: string, data: unknown) {
  writeFileSync(file, JSON.stringify(data) + "\n", { flag: "wx" });
}
const basis = async (c: DatomicClient, db: string) => {
  const cut = await c.begin(db);
  await c.release(db, cut.handle);
  return cut.position;
};
function assigned(row: Row, p: number, clock: number): Row {
  return { ...row, recorded_position: p, recorded_at: clock };
}

async function seed(url: string, file: string, nonce: string) {
  const c = new DatomicClient(url, 35_000);
  try {
    const scope = JSON.stringify(["triplex-scope-v1", "test", "prepared-field", nonce, 0]);
    const init = await c.create(scope, "lean", true, 35_000);
    assert(init.created && init.strictRecordClocks);
    const population = await seedPooled(c, init.db);
    let head = population.head;
    const owners = [
      ...new Set(cells(arms[0]!).flatMap(({ tape }) => tape.map((o) => root(o.account, o.person)))),
    ].sort();
    const fields = new Map<string, Row[]>();
    for (let i = 0; i < owners.length; i += 200) {
      const facts = owners
        .slice(i, i + 200)
        .flatMap((e) => [fact(e, answer, "seed/answer"), fact(e, note, "seed/note")]);
      const input = command("baseline-fields-" + i, facts, [], false);
      const ack = (await c.transact(init.db, input)) as Ack;
      assert.equal(ack.operationId, input.operationId);
      assert.equal(Number(ack.position.v), ++head);
      for (const row of input.rows) {
        const group = fields.get(row.entity_id) ?? [];
        group.push(assigned(row, head, ack.recordedAt.v));
        fields.set(row.entity_id, group);
      }
    }
    // [DX-PREP1] Why: seal the real predecessor rows that both writers will replace.
    // Rejected: treating first-time field insertion as a prepared replacement.
    for (let i = 0; i < owners.length; i += 40) {
      const batch = owners.slice(i, i + 40);
      const actual = await c.rows(init.db, { entityIds: batch, history: false });
      const byId = new Map(actual.map((row) => [row.id, row]));
      for (const e of batch)
        for (const row of fields.get(e)!) assert.deepEqual(byId.get(row.id), row);
    }
    assert.equal(await basis(c, init.db), head);
    save(file, {
      scope,
      db: init.db,
      head,
      roster: pooledDigest,
      facts: 16_245_050,
      fields: [...fields],
      seeds: population.seeds,
    } satisfies Seed);
  } finally {
    c.close();
  }
}

async function phase(
  clients: DatomicClient[],
  reader: DatomicClient,
  db: string,
  head: number,
  fields: Map<string, Row[]>,
  frozen: Set<string>,
  cell: ReturnType<typeof cells>[number],
  fair?: FairTurns,
) {
  const inputs = new Map<string, Input>();
  const rows: {
    id: string;
    ordinal: number;
    account: number;
    person: number;
    due: number;
    end: number;
    peer?: number;
    fairTurn?: number;
    sent?: number;
    reason?: string;
    ack?: Ack;
    receipt?: { p: number; t: string; clock: number };
  }[] = [];
  const pending = new Set<Promise<void>>();
  const busy = new Set<string>(),
    queues = accounts.map(() => [] as number[]);
  const started = performance.now(),
    elapsed = () => performance.now() - started;
  const phaseStartNs = process.hrtime.bigint().toString();
  const phaseWallMs = Date.now();
  let turn = 0,
    nextPeer = 0;
  const deadline = cell.duration * 1000 + 1000;
  const pick = (account: number) => {
    const index = queues[account]!.findIndex((n) => {
      const o = cell.tape[n]!;
      const e = root(o.account, o.person);
      return !busy.has(e) && !frozen.has(e);
    });
    if (index >= 0) return { account, index, due: cell.tape[queues[account]![index]!]!.ms };
  };
  function dispatch() {
    if (elapsed() > deadline) return;
    if (fair) {
      fair.dispatch(
        () =>
          accounts.flatMap(({ index }) => {
            const ready = pick(index);
            return ready ? [ready] : [];
          }),
        grant,
      );
      return;
    }
    while (pending.size < 96 && elapsed() <= deadline) {
      let granted = false;
      for (let i = 0; i < queues.length; i++) {
        const candidate = pick((turn + i) % queues.length);
        if (!candidate) continue;
        turn = (candidate.account + 1) % queues.length;
        grant(candidate);
        granted = true;
        break;
      }
      if (!granted) break;
    }
  }
  function grant({ account, index }: NonNullable<ReturnType<typeof pick>>, fairTurn?: number) {
    const ordinal = queues[account]!.splice(index, 1)[0]!;
    const n = ordinal,
      o = cell.tape[n]!,
      e = root(o.account, o.person),
      id = operation(cell.label, n);
    const facts = [fact(e, answer, `${o.subtask}/${o.ordinal}`)];
    if (o.extra) facts.push(fact(e, note, id));
    const previous = fields.get(e)!;
    const old = previous.filter((r) => r.attribute === answer || o.extra);
    const input = command(id, facts, old);
    input.sourceK = Math.max(head, ...previous.map((r) => r.recorded_position));
    input.groupAccount = accounts[o.account]!.key;
    input.writeClass = "live";
    inputs.set(id, input);
    busy.add(e);
    const sent = elapsed(),
      peer = nextPeer++ % clients.length;
    const record = {
      id,
      ordinal: n,
      account: o.account,
      person: o.person,
      due: o.ms,
      peer,
      fairTurn,
      sent,
    };
    let known = false;
    const work = (async () => {
      let ack: Ack;
      try {
        ack = (await clients[peer]!.transact(db, input)) as Ack;
      } catch (err) {
        // [DX-PREP1] Why: the next same-person offer cannot speculate on a failed or uncertain predecessor.
        // Rejected: sending a later edit against a row whose retirement is unknown.
        known =
          err instanceof DatomicHttpError && err.status < 500 && err.code !== "OperationDuplicate";
        frozen.add(e);
        rows.push({
          ...record,
          end: elapsed(),
          reason: err instanceof DatomicHttpError ? err.code : "transport",
        });
        return;
      }
      const end = elapsed();
      assert.equal(ack.operationId, id);
      assert(ack.writePath?.function && Number(ack.t.v) > 0 && Number.isFinite(ack.recordedAt.v));
      assert(Number(ack.position.v) > input.sourceK!);
      fields.set(e, [
        ...previous.filter((r) => !old.includes(r)),
        ...input.rows
          .slice(0, facts.length)
          .map((r) => assigned(r, Number(ack.position.v), ack.recordedAt.v)),
      ]);
      rows.push({ ...record, end, ack });
      known = true;
    })().finally(() => {
      pending.delete(work);
      busy.delete(e);
      fair?.resolved(known);
      dispatch();
    });
    pending.add(work);
  }
  for (const [n, o] of cell.tape.entries()) {
    while (elapsed() < o.ms) await sleep(Math.ceil(o.ms - elapsed()));
    queues[o.account]!.push(n);
    dispatch();
  }
  while (pending.size) await Promise.all([...pending]);
  const drained = elapsed();
  for (const n of queues.flat()) {
    const o = cell.tape[n]!;
    rows.push({
      id: operation(cell.label, n),
      ordinal: n,
      account: o.account,
      person: o.person,
      due: o.ms,
      end: drained,
      reason: frozen.has(root(o.account, o.person)) ? "predecessor" : "expired",
    });
  }
  assert.equal(rows.length, cell.tape.length);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const latestAck = rows.reduce(
    (latest, r) => Math.max(latest, Number(r.ack?.position.v ?? head)),
    head,
  );
  const catchupDeadline = performance.now() + 6000;
  let after = await basis(reader, db);
  while (after < latestAck && performance.now() < catchupDeadline) {
    await sleep(50);
    after = await basis(reader, db);
  }
  assert(after >= latestAck, "read peer did not reach the last acknowledged position");
  let p = head;
  while (p < after) {
    const page = await reader.request<{ transactions: [string, number, string[]][] }>(
      "POST",
      `/v2/db/${db}/transactions`,
      { after: p, limit: 200, basis: { recordedPosition: after } },
    );
    assert(page.transactions.length);
    for (const [tx, position, texts] of page.transactions) {
      assert.equal(position, ++p);
      const decoded = texts.map(decodeRowText);
      const id = decoded.find((r) => r.attribute === ":_tx/command-id")?.value_string;
      const rec = id && byId.get(id),
        input = id && inputs.get(id);
      assert(rec && input && id && !rec.receipt);
      const clock = decoded[0]!.recorded_at;
      const same = new Set(input.newIds);
      const changes = input.rows
        .filter((r) => r.attribute === ":_tx/change")
        .map((r) => {
          const change = JSON.parse(r.value_json!);
          if (same.has(change.tripleId)) change.recordedAt = clock;
          if (change.op === "retract") change.retractedAt = clock;
          return change;
        });
      checkJournal([tx, position, decoded], {
        tx: input.claims[0]!.txId,
        position,
        clock,
        command: id,
        root: input.entities![0]!,
        changes,
      });
      if (rec.ack) {
        assert.equal(Number(rec.ack.position.v), position);
        assert.equal(rec.ack.recordedAt.v, clock);
        rec.receipt = { p: position, clock, t: rec.ack.t.v };
      } else {
        const observed = await reader.operation(db, id);
        assert.equal(observed.operationId, id);
        assert.equal(Number(observed.position?.v), position);
        assert.equal(observed.recordedAt?.v, clock);
        rec.receipt = { p: position, clock, t: observed.t!.v };
      }
    }
  }
  assert(rows.every((r) => !r.ack || r.receipt));
  return {
    label: cell.label,
    rate: cell.rate,
    seconds: cell.duration,
    tapeSha: cell.tapeSha,
    phaseStartNs,
    phaseWallMs,
    drained,
    head,
    after,
    rows,
  };
}

async function armRun(
  arm: Arm,
  file: string,
  out: string,
  slot: string,
  commit: string,
  nonce: string,
  stackPath: string,
  readerUrl: string,
  urls: string[],
) {
  const bytes = readFileSync(file),
    baseline: Seed = JSON.parse(bytes.toString());
  assert.equal(baseline.roster, pooledDigest);
  assert.equal(baseline.facts, 16_245_050);
  assert.deepEqual(
    baseline.seeds.map((s) => [s.account, s.subjects, s.facts]),
    accounts.map((a) => [a.index, 10000, 1_624_505]),
  );
  const stack = load<{ gatewaySourceSha256: string; prefix: string }>(stackPath);
  assert.equal(stack.prefix, slot);
  assert.equal(urls.length, arm.writers);
  assert.equal(new Set([...urls, readerUrl]).size, arm.writers + 1);
  const clients = urls.map((url) => new DatomicClient(url, 8000));
  const reader = new DatomicClient(readerUrl, 35_000);
  try {
    const options = [];
    for (const client of clients) {
      const init = await client.create(baseline.scope, "lean", true, 35_000);
      assert(!init.created && init.db === baseline.db);
      const got = await client.request<any>("GET", `/v1/db/${init.db}/write-options`);
      assert.deepEqual(
        [got.database, got.attempt, got.gatewaySourceHash, got.position, got.rowsVersion],
        [init.db, nonce, stack.gatewaySourceSha256, baseline.head, 3],
      );
      assert(got.strictRecordClocks && got.commitFunctionInstalled);
      const b = arm.writer === "S";
      assert.deepEqual(
        [
          !!got.subjectSave,
          got.options.groupCommit,
          got.options.livePriority,
          got.options.predecessorLookup,
          got.options.stageClock,
          got.options.queueClock,
          got.options.ledger,
          got.options.packedJournal,
          got.options.smallRows,
          got.options.reusePrepared,
          got.options.fastReply,
          got.options.fieldCoalesce,
          got.options.budgetMicros,
          got.options.maxMembers,
        ],
        [b, !b, !b, true, true, true, false, false, false, true, true, false, null, 8],
      );
      if (b) assert.match(got.subjectFunction, /^:triplex\.subject\/v-[0-9a-f]{24}$/);
      options.push(got);
    }
    const opened = await reader.create(baseline.scope, "lean", true, 35_000);
    assert(!opened.created && opened.db === baseline.db);
    assert.equal(await basis(reader, baseline.db), baseline.head);
    const fairCredits = arm.writer === "S" ? requestedCredits : 0;
    const fair = fairCredits ? new FairTurns(accounts.length, fairCredits) : undefined;
    const { scope, db, head } = baseline;
    save(out + "/header.json", {
      arm,
      slot,
      commit,
      nonce,
      scope,
      db,
      head,
      seedSha: digest(bytes),
      dumpSha: process.env.DX_PREP1_DUMP_SHA,
      options,
      fairCredits,
      seconds,
      gatewaySource: stack.gatewaySourceSha256,
    });
    const fields = new Map(baseline.fields),
      frozen = new Set<string>();
    let cut = head;
    for (const cell of cells(arm)) {
      const result = await phase(clients, reader, db, cut, fields, frozen, cell, fair);
      cut = result.after;
      save(`${out}/${cell.label}.json`, result);
    }
    save(out + "/complete.json", { nonce, slot, commit, cut });
  } finally {
    for (const client of clients) client.close();
    reader.close();
  }
}

async function preflight(out: string) {
  const arm = arms[1]!,
    allCells = cells(arm, 1);
  const fields = new Map<string, Row[]>();
  const feed: [string, number, string[]][] = [],
    blocks: unknown[] = [];
  let p = 100;
  const nonce = "preflight-producer-collector";
  for (const cell of allCells)
    for (const o of cell.tape) {
      const e = root(o.account, o.person);
      if (!fields.has(e))
        fields.set(
          e,
          command("seed-" + e, [fact(e, answer, "old"), fact(e, note, "old")], [], false).rows,
        );
    }
  const db = "mock-prep1";
  const fair = requestedCredits ? new FairTurns(accounts.length, requestedCredits) : undefined;
  // [DX-PREP1] Why: exercise the real sender, row encoder, feed checker and file writer without a lease.
  // Rejected: hand-writing a fixture with the collector's expected verdict.
  const fake = {
    begin: async () => ({ handle: "mock", position: p }),
    release: async () => undefined,
    request: async (_method: string, _path: string, input: { after: number }) => ({
      transactions: feed.filter(([, pos]) => pos > input.after).slice(0, 200),
    }),
    transact: async (_db: string, input: Input): Promise<Ack> => {
      const tick = ++p,
        clock = 1_800_000_000_000 + tick,
        t = tick + 1000;
      feed.push([
        input.claims[0]!.txId,
        tick,
        input.rows
          .filter((r) => r.entity_type === "_Transaction")
          .map((old) => {
            const row = assigned(old, tick, clock);
            if (row.attribute === ":_tx/position") row.value_number = tick;
            if (row.attribute === ":_tx/instant") row.value_datetime = clock;
            if (row.attribute === ":_tx/change") {
              const c = JSON.parse(row.value_json!);
              if (c.op === "assert") c.recordedAt = clock;
              else c.retractedAt = clock;
              row.value_json = JSON.stringify(c);
            }
            return encodeRowText(row);
          }),
      ]);
      const now = Number(process.hrtime.bigint());
      blocks.push({
        attempt: nonce,
        db,
        start: now,
        end: now + 200,
        bytes: [200],
        members: [{ t, "read-at": now - 300, "started-at": now - 200, "applied-at": now - 100 }],
      });
      return {
        operationId: input.operationId,
        position: { v: String(tick) },
        t: { v: String(t) },
        recordedAt: { v: clock },
        timeline: { payloadPrepared: 20, submitted: 25, completed: 30, responsePrepared: 40 },
        writePath: { function: "mock/subject" },
        subjectSave: "mock/subject",
      };
    },
  } as unknown as DatomicClient;
  const header = {
    arm,
    slot: "fixture",
    commit: "fixture",
    nonce,
    scope: "mock",
    db,
    head: p,
    seedSha: "mock-seal",
    dumpSha: "mock-dump",
    seconds: 1,
    fairCredits: requestedCredits,
    fixture: true,
  };
  save(out + "/header.json", header);
  for (const cell of allCells)
    save(
      out + "/" + cell.label + ".json",
      await phase([fake], fake, db, p, fields, new Set(), cell, fair),
    );
  save(out + "/complete.json", { nonce, slot: header.slot, commit: header.commit, cut: p });
  blocks.push({ attempt: nonce, dropped: 0, end: true });
  writeFileSync(out + "/native.ndjson", blocks.map((b) => JSON.stringify(b)).join("\n") + "\n", {
    flag: "wx",
  });
}

const [action, ...args] = process.argv.slice(2);
if (action === "seed") await seed(args[0]!, args[1]!, args[2]!);
else if (action === "arm") {
  const [id, file, out, slot, commit, nonce, stack, reader, ...urls] = args;
  const arm = arms.find((a) => a.id === id);
  assert(arm && file && out && slot && commit && nonce && stack && reader);
  await armRun(arm, file, out, slot, commit, nonce, stack, reader, urls);
} else if (action === "preflight") await preflight(args[0]!);
else if (action === "plan") {
  const duration = args[0] ? Number(args[0]) : seconds;
  const tapes = Object.fromEntries(
    cells(arms[0]!, duration).map(({ label, tape }) => [
      label,
      tape.map(({ ms, account, person, subtask, ordinal, extra }) => [
        ms,
        account,
        person,
        subtask,
        ordinal,
        extra,
      ]),
    ]),
  );
  console.log(
    JSON.stringify({
      seconds: duration,
      fairCredits: requestedCredits,
      tapes,
      arms: arms.map((arm) => ({
        ...arm,
        cells: cells(arm, duration).map(({ label, rate, tape, tapeSha }) => ({
          label,
          rate,
          tapeSha,
          offered: tape.length,
          predicted: prediction(arm.writers, arm.writer, rate, label.endsWith("-alone")),
        })),
      })),
    }),
  );
} else assert.fail("expected seed, arm, preflight or plan");
