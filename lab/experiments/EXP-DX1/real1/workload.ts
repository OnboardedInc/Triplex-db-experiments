import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { openComposition, type Receipt } from "../../../bench/lib/composition.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { Rng, seedOf } from "../../../bench/lib/rng.ts";
import {
  ActiveSet,
  generateTrace,
  TRACE_DEFAULTS,
  zipfCdf,
  type TraceEvent,
} from "../../../bench/lib/trace.ts";
import { memberOf, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { ack, lookup, record } from "../load1/oracle.ts";
import type { Frame } from "../load1/source.ts";
import { hex, scopeKey } from "../v01/adopt.ts";
import { facts, subject, type Account } from "./population.ts";
import { readPerson } from "./load.ts";
import { write, type Image } from "./seal.ts";

const shares = { deep: 0.8, thin: 0.15, small: 0.05 };
const validAt = SEED_VALID_FROM + 91 * 86_400_000;
const now = () => performance.timeOrigin + performance.now();
const kinds = ["deep", "thin", "small", "quiet"] as const;
type Kind = (typeof kinds)[number];
type Offer = { event: TraceEvent; account: Account; person: number; kind: Kind };

export function offers(
  accounts: Account[],
  seconds: number,
  sweep: number,
  diagnostic: boolean,
  quietOnly: boolean,
) {
  const kinds = quietOnly ? (["quiet"] as const) : (["deep", "thin", "small", "quiet"] as const);
  const mixed = kinds.flatMap((kind) => {
    const selected = accounts.filter((a) =>
      kind === "quiet" ? a.id === 0 : a.id !== 0 && a.kind === kind,
    );
    const size = (a: Account) => (kind === "thin" ? a.people - sweep - 2 : a.people);
    const subjects = selected.reduce((sum, a) => sum + size(a), 0);
    assert(subjects > 0);
    const quiet = kind === "quiet";
    const params = {
      ...TRACE_DEFAULTS,
      steadyFactsPerS: quiet ? 3.5 * meanSaveFacts : 15 * shares[kind],
      ...(quiet ? { firstBurstAtS: Infinity } : {}),
      ...(diagnostic ? { steadyFactsPerS: quiet ? 30 : 150, firstBurstAtS: Infinity } : {}),
    };
    const smallRosters =
      kind === "small"
        ? selected.map((a) => {
            const active = new ActiveSet("real1/small/" + a.id, a.people, params);
            return { active, cdf: zipfCdf(active.size, params.zipfS) };
          })
        : undefined;
    const smallPeople = new Map<number, number>();
    return generateTrace({ seed: "real1/" + kind, subjects, durationS: seconds, params }).map(
      (event) => {
        if (smallRosters) {
          // [DX-REAL1] Why: exercise the small accounts evenly and keep TARGETS' active/uniform draw within each.
          // Rejected: concentrating the single global Zipf head on a few large small accounts.
          const i = event.seq % selected.length;
          const account = selected[i]!;
          if (!event.resend) {
            const { active, cdf } = smallRosters[i]!;
            active.advance(event.atMs / 1000);
            const rng = new Rng(seedOf("real1/small/subject/" + event.seq));
            const u = rng.next();
            smallPeople.set(
              event.seq,
              event.active ? active.slots[cdf.findIndex((p) => p >= u)]! : rng.int(account.people),
            );
          }
          const person = smallPeople.get(event.seq);
          assert(person !== undefined);
          return { event, account, person, kind };
        }
        let person = event.subject;
        for (const account of selected) {
          if (person < size(account)) return { event, account, person, kind };
          person -= size(account);
        }
        throw Error("Trace subject is outside its cohort");
      },
    );
  });
  return mixed.sort(
    (a, b) =>
      a.event.atMs - b.event.atMs || a.kind.localeCompare(b.kind) || a.event.seq - b.event.seq,
  );
}

type Options = {
  seconds: number;
  sweep: number;
  diagnostic: boolean;
  binding: { source: string; slot: string; nonce: string };
  quietOnly: boolean;
  residency?: () => unknown;
};
type Saved = {
  receipt: Receipt;
  frame: Frame;
  meta: { commandId: string; actor: string; correlationId: string };
  elapsed: number;
};
const histogram = () =>
  Object.fromEntries(kinds.map((k) => [k, new Histogram()])) as Record<Kind, Histogram>;
const meanSaveFacts = TRACE_DEFAULTS.sizeClasses.reduce(
  (sum, size) => sum + (size.share * (size.min + size.max)) / 2,
  0,
);
const deadline = 30_000;
const digest = (rows: string[]) => hex(JSON.stringify(rows.sort()));

export async function workload(
  image: Image,
  writeUrl: string,
  readUrl: string,
  out: string,
  options: Options,
) {
  const { seconds, sweep, diagnostic, quietOnly, residency } = options;
  const { parent, proof, accounts } = image;
  const thin = accounts.find((a) => a.kind === "thin")!;
  assert(Number.isSafeInteger(seconds) && seconds >= (diagnostic ? 3 : 180) && seconds <= 900);
  assert(Number.isSafeInteger(sweep) && sweep > 0 && sweep < thin.people - 2);
  assert.equal(writeUrl, process.env.DATOMIC_URL);
  const writer = await openComposition("reach", "datomic", parent.scope);
  const reader = new DatomicClient(readUrl, 35_000);
  const ticket = randomUUID();
  const key = scopeKey(parent.scope);
  try {
    const tape = offers(accounts, seconds, sweep, diagnostic, quietOnly);
    const tapeSha = hex(JSON.stringify(tape));
    write(path.join(out, "tape.json"), {
      ...options.binding,
      seedSource: image.source,
      seedSlot: image.slot,
      cut: proof.cut,
      ticket,
      tapeSha,
      seconds,
      sweep,
      diagnostic,
      quietOnly,
      tape,
    });
    const pending = new Map<string, Promise<Saved>>();
    const owners = new Map<string, Promise<unknown>>();
    const stored = new Map<string, Saved>();
    const positions = new Map<number, Saved>();
    const save = histogram(),
      read = histogram(),
      feed = histogram();
    const readEvidence: {
      kind: Kind;
      account: Account;
      person: number;
      cut: number;
      band: number;
      hot: boolean;
      sha: string;
    }[] = [];
    const offerEvidence: {
      command: string;
      kind: Kind;
      resend: boolean;
      ackLoss: boolean;
      due: number;
      at: number;
      position: number;
    }[] = [];
    const memoryBeforeTraffic = residency?.();
    const elapsedStart = now() + 250;

    const operation = (item: Offer, commandId: string) => {
      const root = subject(item.account, item.person),
        event = item.event;
      const ops = Array.from({ length: event.facts }, (_, i) => ({
        op: "assert" as const,
        entityId: root,
        attribute: ":real1/" + event.kind + "/" + event.seq + "/" + i,
        value: {
          type: "string" as const,
          value: hex(JSON.stringify([item.kind, event.seq, i])).slice(0, 24),
        },
        validFrom: validAt - (event.correction ? TRACE_DEFAULTS.correctionBackMs : 0),
      }));
      const frame: Frame = { first: event.seq, end: event.seq + 1, operations: ops };
      const meta = { commandId, actor: event.kind, correlationId: hex(JSON.stringify(ops)) };
      return { frame, meta, root };
    };

    const observingFeed = async () => {
      let cut = proof.cut;
      do {
        assert(now() <= elapsedStart + seconds * 1000 + 120_000, "Feed did not reach final cut");
        // The verifier compares the gateway's durable journal with the separately generated frame after all ACKs settle.
        const page = await writer.feedPage(cut, 32);
        for (const tx of page.transactions) {
          assert.equal(tx.position, ++cut);
          observed.push({ tx, seen: now() });
        }
        if (!page.transactions.length) await sleep(25);
      } while (endCut === undefined || cut < endCut);
      assert.equal(cut, endCut);
    };
    const observed: {
      tx: Awaited<ReturnType<typeof writer.feedPage>>["transactions"][number];
      seen: number;
    }[] = [];
    let endCut: number | undefined;
    let latest = proof.cut;
    const reading: Promise<unknown>[] = [];
    const feeding = observingFeed().then(
      () => undefined,
      (error) => error as unknown,
    );
    let result: PromiseSettledResult<unknown>[];
    try {
      for (const item of tape) {
        const due = elapsedStart + item.event.atMs;
        while (now() < due) await sleep(Math.ceil(due - now()));
        const cmd = "real1-" + ticket + "-" + item.kind + "-" + item.event.seq;
        const { frame, meta, root } = operation(item, cmd);
        const prior = item.event.resend ? pending.get(cmd) : undefined;
        if (item.event.resend) assert(prior);
        const row = (prior ?? owners.get(root) ?? Promise.resolve()).then(async () => {
          assert(now() - due < deadline, "Offer expired before dispatch");
          const send = () => writer.transact(frame.operations, meta);
          const original = prior ? (await prior).receipt : undefined;
          const response = await send();
          const confirmReplay = async (
            retry: Awaited<ReturnType<typeof send>>,
            receipt: Receipt,
          ) => {
            if (retry.ok) {
              assert.deepEqual(ack(frame, retry.value), ack(frame, receipt));
            } else {
              assert.equal(retry.tag, "CommandAlreadyCommittedError");
              assert.equal(retry.error?.transactionId, receipt.txId);
            }
            assert.deepEqual(await lookup(writer, frame, meta), ack(frame, receipt));
          };
          let receipt: Receipt;
          if (original) {
            await confirmReplay(response, original);
            receipt = original;
          } else {
            assert(response.ok, response.ok ? "" : response.tag);
            receipt = response.value;
            if (item.event.ackLoss) await confirmReplay(await send(), receipt);
          }
          ack(frame, receipt);
          const seen = now(),
            elapsed = seen - due;
          assert(elapsed < deadline);
          if (!prior) {
            assert(!positions.has(receipt.position) && receipt.position > proof.cut);
            save[item.kind].recordMs(elapsed);
          }
          offerEvidence.push({
            command: cmd,
            kind: item.kind,
            resend: item.event.resend,
            ackLoss: item.event.ackLoss,
            due,
            at: seen,
            position: receipt.position,
          });
          const value = { receipt, frame, meta, elapsed };
          if (!prior) {
            stored.set(cmd, value);
            positions.set(receipt.position, value);
            latest = Math.max(latest, receipt.position);
          }
          return value;
        });
        // Keep rejection observed immediately, then propagate it through the terminal allSettled check.
        row.catch(() => {});
        if (!prior) {
          pending.set(cmd, row);
          owners.set(root, row);
          const reads = row.then(async ({ receipt }) => {
            const rng = new Rng(seedOf(cmd.replace(ticket, "tape")));
            for (let i = 0; i < 10; i++) {
              const band = item.event.seq % 2 === 0 ? i : i + 10;
              const hot = i < 5;
              const person = hot
                ? item.person
                : rng.int(item.account.people - (item.kind === "thin" ? sweep + 2 : 0));
              const cut =
                band < 16
                  ? latest
                  : band < 19
                    ? Math.max(proof.cut, receipt.position - 1)
                    : parent.cut;
              const began = now();
              const actual = await readPerson(reader, key, item.account, person, cut, validAt);
              read[item.kind].recordMs(now() - began);
              readEvidence.push({
                kind: item.kind,
                account: item.account,
                person,
                cut,
                band,
                hot: hot && began - (due + (stored.get(cmd)?.elapsed ?? 0)) <= 60_000,
                sha: digest(
                  actual
                    .filter((r) => r.entityId === subject(item.account, person))
                    .map((r) => memberOf(r.entityId, r.attribute, r.value)),
                ),
              });
            }
          });
          reads.catch(() => {});
          reading.push(reads);
        } else reading.push(row);
      }
      result = await Promise.allSettled([...pending.values(), ...reading]);
    } finally {
      endCut = await writer.currentPosition();
    }
    const feedError = await feeding;
    if (feedError) throw feedError;
    for (const status of result) if (status.status === "rejected") throw status.reason;
    assert.equal(positions.size, tape.filter((o) => !o.event.resend).length);
    assert.equal(endCut, proof.cut + positions.size);
    const byRoot = new Map<string, Saved[]>();
    const primaryEvidence = new Map(
      offerEvidence.filter((o) => !o.resend).map((o) => [o.command, o]),
    );
    for (const { tx, seen } of observed) {
      const entry = positions.get(tx.position);
      assert(entry);
      assert.deepEqual(record(entry.frame, entry.meta, tx), ack(entry.frame, entry.receipt));
      assert.equal(stored.get(tx.commandId!), entry);
      const kind = entry.meta.commandId.split("-").at(-2) as Kind;
      const root = entry.frame.operations[0]!.entityId;
      const list = byRoot.get(root) ?? [];
      list.push(entry);
      byRoot.set(root, list);
      const offered = primaryEvidence.get(tx.commandId!);
      assert(offered);
      feed[kind].recordMs(Math.max(0, seen - entry.receipt.instant));
    }
    for (const row of readEvidence) {
      const root = subject(row.account, row.person);
      const exists = row.account.kind === "deep" || row.cut > parent.cut;
      const base = exists
        ? facts(row.account, row.person)
            .filter((f) => f.e === root)
            .map((f) => memberOf(f.e, f.a, f.v))
        : [];
      const changes = (byRoot.get(root) ?? [])
        .filter((s) => s.receipt.position <= row.cut)
        .flatMap((s) => s.frame.operations.map((o) => memberOf(o.entityId, o.attribute, o.value)));
      assert.equal(row.sha, digest([...base, ...changes]), "Foreground pinned read differs");
    }
    const cold = new Histogram();
    const memoryBeforeSweep = residency?.();
    const sweepStart = thin.people - sweep - 2;
    if (!quietOnly) {
      // [DX-REAL1] Why: reserve untouched subjects out of both foreground streams and visit each selected ID once.
      // Rejected: sampling known cached subjects or running a dry read before starting the clock.
      for (let i = sweepStart; i < sweepStart + sweep; i++) {
        const started = now();
        const rows = await readPerson(reader, key, thin, i, proof.cut);
        cold.recordMs(now() - started);
        assert.equal(
          digest(rows.map((r) => memberOf(r.entityId, r.attribute, r.value))),
          digest(facts(thin, i).map((r) => memberOf(r.e, r.a, r.v))),
        );
      }
    }
    const memoryAfterSweep = residency?.();
    const seenAccounts = Object.fromEntries(
      kinds.map((kind) => [
        kind,
        [...new Set(tape.filter((o) => o.kind === kind).map((o) => o.account.id))],
      ]),
    );
    const summarize = (rows: Record<Kind, Histogram>) =>
      Object.fromEntries(kinds.map((kind) => [kind, rows[kind].summary()]));
    write(path.join(out, "workload.json"), {
      ...options.binding,
      seedSource: image.source,
      seedSlot: image.slot,
      ticket,
      tapeSha,
      diagnostic,
      quietOnly,
      initialCut: proof.cut,
      endCut,
      observedAccounts: seenAccounts,
      seconds,
      meanSaveFacts,
      targetBusyShares: shares,
      savedPerSecond: positions.size / seconds,
      save: summarize(save),
      read: summarize(read),
      feed: summarize(feed),
      hotReads: readEvidence.filter((row) => row.hot).length,
      readBands: [0, 16, 19].map(
        (start, i) =>
          readEvidence.filter((row) => row.band >= start && row.band < [16, 19, 20][i]!).length,
      ),
      firstThin: { ...cold.summary(), cut: proof.cut, start: sweepStart },
      memoryBeforeTraffic,
      memoryBeforeSweep,
      memoryAfterSweep,
      residentBytesPerUntouchedPerson: null,
      offers: offerEvidence,
      readEvidence,
    });
  } finally {
    reader.close();
    await writer.close();
  }
}
