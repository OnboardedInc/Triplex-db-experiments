// [DX-ACT8, review item 5] Cross-account isolation fuzzer (diagnostic only; Mac, in process, toy size), over the
// review's in-process harness (memstore.ts) and the REAL JoinedAccount, Archive and RecordedNotices.
// Each schedule draws two or three accounts (names that may be prefixes of each other) and one script per account:
// Publishes with command IDs drawn from ONE shared pool, documents drawn from one shared pool (so accounts publish the
// same documents, by reference or inline, under the same release names), and saves of the same subject keys
// (`pl:s0000000i` in every account) with values fixed by the script. The scripts then run twice:
//   shared: every account's script at once in ONE database, interleaved at every store call;
//   alone : each account's script by itself in a database of its own.
// After each run every account settles (values of every release, notices of every event). The check: each account's
// result in the shared database equals its result alone (the outcome of every step, the release documents in order,
// every release's stored changes, the recorded notices in order and every ledger); positions are not compared.
// Run: node --experimental-strip-types lab/experiments/EXP-DX1/act10/isolation-fuzz.ts --from 0 --count 100 [--out f.json]
// TX2_ACCOUNT_KEYS=1 is the fix under test; unset, the fuzzer must find the review's F1 and F2 (the control).
import { writeFileSync } from "node:fs";
import { dropMemoryScope } from "../../../bench/lib/memory.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { ids } from "../../../bench/lib/world.ts";
import { Documents } from "../notify1/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { toWire } from "../actv-lazy/join/check.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { readLedgers } from "../actv-lazy/join/ledger-parts.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { heldAccount, MemDb, memStore, Proc, rng, seedAccount, type Rng } from "./memstore.ts";

const arg = (k: string, d?: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1]! : d;
};
const FROM = Number(arg("--from", "0")),
  COUNT = Number(arg("--count", "20")),
  OUT = arg("--out"),
  ONLY = arg("--only"),
  PEOPLE = Number(arg("--people", "4"));
const validTime = W0.POPULATION_VALID_TIME;
const V = Date.parse(validTime);
process.env.TX2_PUBLISH_BESIDE = "1";
process.env.TX2_ENROL_BESIDE_SAVES = "1";
const shape = (forms: number, permille: number) => parseShape("forms=" + forms + ",policies=" + forms + ",permille=" + permille);
const DOCS: Record<string, W0.ReleaseDoc> = {
  R1: W0.R1.doc,
  R2: W0.R2.doc,
  L20: largeRelease(W0.R1.doc, shape(20, 1000)),
  L20h: largeRelease(W0.R1.doc, shape(20, 500)),
  L8b: largeRelease(W0.R2.doc, shape(8, 700)),
};
const NAMES = [["acct-a", "acct-b"], ["a-003", "a-0031"], ["acct-a", "acct-b", "acct-c"], ["definitions", "releases"], ["ACCT", "acct"]];
const IDS = ["r1", "r2", "release-2026-11-24", "publish", "x"];
const ATTRS = [":person/custom-pay-cents", ":person/custom-start", ":person/custom-background", ":task/progress"];

type Step =
  | { kind: "publish"; id: string; doc: string; docs: "inline" | "ref" }
  | { kind: "save"; i: number; attribute: string; n: number };
type Script = { account: string; steps: Step[] };
type Result = { outcomes: string[]; releases: string[]; changes: string[]; notices: string; ledgers: string };

function scripts(r: Rng): Script[] {
  const names = r.pick(NAMES);
  const refAll = r.next() < 0.5;
  return names.map((account) => {
    const steps: Step[] = [];
    const used = new Set<string>();
    const n = 2 + r.int(5);
    for (let k = 0; k < n; k++) {
      if (r.next() < 0.45) steps.push({ kind: "save", i: r.int(PEOPLE), attribute: r.pick(ATTRS), n: 1 + r.int(9) });
      else {
        // A command ID from the shared pool, unique within this account's script.
        let id = r.pick(IDS);
        while (used.has(id)) id = id + "-" + k;
        used.add(id);
        steps.push({ kind: "publish", id, doc: r.pick(Object.keys(DOCS)), docs: refAll || r.next() < 0.3 ? "ref" : "inline" });
      }
    }
    return { account, steps };
  });
}

/** One save of subject `i`'s `attribute`: the value is fixed by the step (the same in the shared and alone runs). */
async function save(proc: Proc, account: string, s: Extract<Step, { kind: "save" }>, tag: string) {
  const prefix = "acct/" + account + "/";
  const comp = proc.comp();
  for (let attempt = 0; attempt < 8; attempt++) {
    const head = await comp.currentPosition();
    const rows = (await comp.sweepPage([prefix + ids.placement(s.i)], { position: head, validAt: V })).rows as any[];
    const t = rows.filter((x) => x.attribute === s.attribute).sort((a, b) => String(a.entityId).localeCompare(String(b.entityId)))[0];
    if (!t) return "no fact";
    const v = t.value.type === "integer" ? { ...t.value, value: String(1000 + s.n * 37) }
      : /^\d{4}-\d{2}-\d{2}$/.test(String(t.value.value)) ? { ...t.value, value: "2026-0" + (1 + (s.n % 9)) + "-1" + (s.n % 9) }
      : s.attribute === ":person/custom-background" ? { ...t.value, value: ["clear", "pending", "consider"][s.n % 3] }
      : { ...t.value, value: String(s.n) };
    const res = await comp.transact(
      [{ op: "retract", id: t.id }, { op: "assert", entityId: t.entityId, attribute: t.attribute, value: v, validFrom: t.validFrom,
        ...(t.validTo == null ? {} : { validTo: t.validTo }) }],
      // A save's command ID is the caller's: here it carries the account (as every product caller must; KEYS.md).
      { commandId: "iso:" + account + ":" + tag + ":" + attempt, actor: "iso/save", preconditions: [{ _tag: "TripleLive", id: t.id }] },
    );
    if (res.ok) return "saved";
  }
  return "save refused";
}

async function runAccount(db: MemDb, script: Script, cut: number, label: string, outcomes: string[]) {
  const held = heldAccount(script.account, PEOPLE, cut);
  const proc = new Proc(db, label + "-" + script.account);
  const a = new JoinedAccount(memStore(proc, held) as any);
  await a.installHeld(validTime);
  outcomes.push("enrolled");
  for (const [k, s] of script.steps.entries()) {
    if (s.kind === "save") outcomes.push(await save(proc, script.account, s, label.replace(/-.*/, "") + k));
    else {
      try {
        await a.publish(s.id, DOCS[s.doc]!, validTime, "owed", undefined, { docs: s.docs });
        outcomes.push("published " + s.doc);
      } catch (e: any) {
        outcomes.push("refused " + s.doc + ": " + String(e?.message).split("\n")[0]!.replace(/[0-9a-f]{16,}/g, "#").slice(0, 80));
      }
    }
  }
  return held;
}

async function settleAndRead(db: MemDb, held: ReturnType<typeof heldAccount>, label: string): Promise<Omit<Result, "outcomes">> {
  const proc = new Proc(db, "settle-" + label + "-" + held.account);
  const s = memStore(proc, held) as any;
  const a = new JoinedAccount(s);
  const head = await s.head();
  const rels = ((await s.controls(head)).releases as any[]).filter((x) => x.storage === "owed").sort((l, r) => l.tx - r.tx);
  const values = new (Archive as any)(a, memStore(proc, held, db.scope + "-" + label + "-" + held.account + "-v"), new BulkQueue(1), "values", "bytes", "progress") as Archive;
  const ledger = process.env.TX2_NOTICE_LEDGER === "parts" ? "parts" : "whole";
  const notices = new (Archive as any)(a, memStore(proc, held, db.scope + "-" + label + "-" + held.account + "-n"), new BulkQueue(1), "notices", "bytes", "progress") as Archive;
  const recorder = new RecordedNotices(notices, ledger);
  const tail = (await a.notices.observe()).value.sequence;
  for (const rel of rels) await values.runValues(rel.seq);
  if (tail) await recorder.record(tail);
  const changes: string[] = [];
  const releases: string[] = [];
  for (const rel of rels) {
    const st = await values.stored(rel.seq);
    releases.push(rel.document?.name ?? rel.documentRef?.release ?? "?");
    changes.push(st.frontier.status + " " + canonical(st.output.map((x: any) => ({ subject: x.subject, changes: x.changes }))));
  }
  const packets = tail ? await recorder.packets(await s.head()) : [];
  const roster = Array.from({ length: PEOPLE }, (_, i) => W0.placementId(i));
  const ndb = new Documents(db.comp as any, "settlement-notices-" + held.account);
  const ledgers = await readLedgers(ndb, roster, await s.head());
  // A work item's version (`wv:<hash>`) is taken over the event's basis, a position; it is compared by order of first
  // appearance (the same versions on the same deliveries), not by value.
  const versions = new Map<string, string>();
  const norm = (text: string) => text.replace(/wv:[0-9a-f]{16,}/g, (v) => {
    if (!versions.has(v)) versions.set(v, "wv#" + versions.size);
    return versions.get(v)!;
  });
  return {
    releases,
    changes: changes.map(norm),
    notices: norm(canonical(packets.flatMap((p: any) => p.deliveries.map(toWire)))),
    ledgers: norm(canonical(roster.map((x) => ledgers.get(x)!.items))),
  };
}

let serial = 0;
async function run(seed: number, all: Script[], only?: number): Promise<Result[]> {
  const scope = "act8-iso-" + process.pid + "-" + ++serial;
  dropMemoryScope(scope);
  const db = new MemDb(scope, seed);
  db.maxYield = only === undefined ? 1 + (seed % 4) : 0;
  const mine = only === undefined ? all : [all[only]!];
  const cuts: number[] = [];
  for (const x of mine) cuts.push(await seedAccount(db, x.account, PEOPLE));
  const outcomes = mine.map(() => [] as string[]);
  const label = only === undefined ? "shared" : "alone";
  const helds = await Promise.all(mine.map((x, j) => runAccount(db, x, cuts[j]!, label, outcomes[j]!)));
  const out: Result[] = [];
  for (const [j, h] of helds.entries()) out.push({ outcomes: outcomes[j]!, ...(await settleAndRead(db, h, label)) });
  dropMemoryScope(scope);
  return out;
}

async function main() {
  const started = Date.now();
  const failures: { seed: number; account: string; field: string; shared: unknown; alone: unknown }[] = [];
  let violating = 0, accounts = 0, publishes = 0, refused = 0;
  for (let seed = FROM; seed < FROM + COUNT; seed++) {
    if (ONLY && String(seed) !== ONLY) continue;
    const all = scripts(rng(seed * 104729 + 7));
    let bad = false;
    try {
      const shared = await run(seed, all);
      for (const [j, x] of all.entries()) {
        const [alone] = await run(seed, all, j);
        accounts++;
        publishes += x.steps.filter((s) => s.kind === "publish").length;
        refused += shared[j]!.outcomes.filter((o) => o.startsWith("refused")).length;
        for (const field of ["outcomes", "releases", "changes", "notices", "ledgers"] as const)
          if (canonical(shared[j]![field]) !== canonical(alone![field])) {
            bad = true;
            if (failures.length < 50) failures.push({ seed, account: x.account, field,
              shared: String(canonical(shared[j]![field])).slice(0, 300), alone: String(canonical(alone![field])).slice(0, 300) });
          }
      }
    } catch (e: any) {
      bad = true;
      if (failures.length < 50) failures.push({ seed, account: "-", field: "threw", shared: String(e?.stack ?? e).slice(0, 400), alone: null });
    }
    if (bad) {
      violating++;
      if (violating <= 5) console.log("[act8-iso] seed " + seed + " differs: " + JSON.stringify(failures.at(-1)).slice(0, 500));
    }
    if ((seed - FROM + 1) % 500 === 0)
      console.log("[act8-iso] " + (seed - FROM + 1) + " schedules, " + violating + " differing, " + Math.round((Date.now() - started) / 1000) + " s");
  }
  const summary = { from: FROM, count: COUNT, people: PEOPLE, keys: process.env.TX2_ACCOUNT_KEYS === "1", schedules: COUNT, violating,
    accounts, publishes, refusedInShared: refused, seconds: (Date.now() - started) / 1000, failures };
  if (OUT) writeFileSync(OUT, JSON.stringify(summary, null, 1));
  console.log("[act8-iso] done " + JSON.stringify({ ...summary, failures: failures.length }));
}
await main();
