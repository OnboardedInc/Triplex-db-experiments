import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  deepSeed,
  makeDeepTrace,
  deepEdits,
  type DeepEvent,
} from "../../../bench/lib/deep-trace.ts";
import { deepOwnFacts } from "../../../bench/lib/deep-world.ts";
import { Rng, seedOf } from "../../../bench/lib/rng.ts";
export const smallId = "deep-small-scopes/1";
export const smallSeconds = 1080;
export function smallPeople(account: number) {
  assert(Number.isInteger(account) && account >= 0 && account < 100);
  return account === 0 || account >= 91 ? 2000 : 100;
}
export const smallRung = (account: number) => "deep-small-" + smallPeople(account);
export const smallScope = (nonce: string, account: number) =>
  "ns-datomic-" + smallRung(account).replaceAll("-", "") + "-deep-" + nonce + "-s" + account;
export function smallPhases(account: number) {
  return ["busy-with-idle", "busy-with-low", "all-low"].map((name, i) => ({
    name,
    readers: account === 0 && i < 2 ? 16 : i === 0 ? 0 : 1,
    measured: true,
    mode: "mixed" as const,
    seconds: 360,
    traceFromS: 360 * i,
  }));
}
// [DX-SCALE1] Why: business activity is low across these accounts, but the same busy account must see an identical offer schedule in both comparison windows. Rejected: dividing a large-account stream by 100 or making the newly opened accounts permanently idle.
export function smallOffers(account: number) {
  const people = smallPeople(account),
    base = makeDeepTrace(deepSeed(account), people, 450);
  const primaries = base.events.filter((e) => !e.resend),
    retries = new Map(base.events.filter((e) => e.resend).map((e) => [e.seq, e]));
  const events: DeepEvent[] = [];
  let next = 0;
  for (const [i, phase] of smallPhases(account).entries()) {
    if (!phase.readers) continue;
    const rng = new Rng(seedOf(smallId + "/offers/" + account));
    const at: number[] = [];
    if (account === 0 && i < 2) {
      for (let t = rng.exp(1.6); t < 360; t += rng.exp(1.6)) at.push(t);
    } else for (let min = 0; min < 6; min++) at.push(min * 60 + 2 + rng.next() * 50);
    for (const t of at) {
      const origin = primaries[next++]!;
      const atMs = phase.traceFromS * 1000 + Math.round(t * 1e6) / 1000;
      const e = { ...origin, atMs, burst: false };
      events.push(e);
      const retry = retries.get(origin.seq);
      if (retry) {
        const retryAt = atMs + retry.atMs - origin.atMs;
        if (retryAt < smallSeconds * 1000) events.push({ ...retry, atMs: retryAt, burst: false });
      }
    }
  }
  events.sort((a, b) => a.atMs - b.atMs || a.seq - b.seq || Number(a.resend) - Number(b.resend));
  const h = createHash("sha256");
  for (const e of events)
    h.update(
      JSON.stringify([e, e.resend ? null : deepEdits(e.subject, e.seq, e.kind, e.deep)]) + "\n",
    );
  return {
    ...base,
    events,
    sha256: h.digest("hex"),
    activeSubjects: new Set(events.map((e) => e.subject)),
  };
}
export function smallPopulation(people: number) {
  const h = createHash("sha256");
  for (let i = 0; i < people; i++) h.update(JSON.stringify(deepOwnFacts(i)) + "\n");
  return h.digest("hex");
}
export function smallTrace(account: number) {
  const p = smallOffers(account),
    pins = JSON.parse(fs.readFileSync(new URL("./small-pins.json", import.meta.url), "utf8"));
  assert.equal(p.sha256, pins.traces[account]);
  return { ...p, populationSha256: pins.population[smallPeople(account)] as string };
}
