import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { setTimeout as delay } from "node:timers/promises";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import { Account } from "./account.ts";
import { persistPublication } from "./dispatch.ts";
import type { TrafficArm } from "./loaded.ts";
import { measured } from "./measure-lock.ts";
import type { DurabilityMode } from "./model.ts";
import { scoreClock, type Offered, type RawDecision } from "./audit-clock.ts";
import { OrderedSaves } from "./save-queue.ts";
import type { Admission, Decision } from "./service.ts";
import { hash } from "./store.ts";

type Route = { name: string; read(id: string): Promise<Decision> };
export type AuditOffer = Offered & { phase: string; queuedForSaveMs?: number; nativeMs?: number };
export async function waitsUntil(t: number) {
  for (;;) {
    const remaining = t - performance.now();
    if (remaining <= 0) return;
    await delay(remaining);
  }
}
export function unseenRelease(i: number) {
  const phase = ["broad", "narrow", "rollback", "no-change"][i % 4]!,
    base = [W0.R2, W0.R3, W0.R1, W0.R1][i % 4]!;
  const doc: W0.ReleaseDoc = JSON.parse(JSON.stringify(base.doc));
  // [DX-ACT2] Why: every offer has unseen bytes while preserving the named domain transitions. The deep fixture has no pay-change baseline. Rejected: cycling three already interpreted documents.
  if (i >= 2) {
    const rule = doc.rules.find((r) => r.id === "PAYCHG")!;
    Object.assign(rule.params, { thresholdCents: 500 + i });
  }
  return { phase, doc };
}

export async function auditOffers(
  a: Account,
  routes: readonly Route[],
  people: readonly string[],
  saves: readonly TrafficArm[],
  native: readonly Admission[],
  count: number,
  mode: DurabilityMode,
  dir: string,
  binding: unknown,
  recordSave: Parameters<TrafficArm["write"]>[1],
  verify: (offers: readonly AuditOffer[], reads: readonly RawDecision[]) => Promise<unknown>,
) {
  assert(count >= 4 && people.length > 419 && routes.length >= 2);
  const withheld = [people[417]!, people[418]!, people.at(-2)!, people.at(-1)!],
    ordinary = people.filter((id) => !withheld.includes(id));
  const routeNames = routes.map((r) => r.name),
    seen = new Set([W0.R1.hash]),
    all: AuditOffer[] = [],
    segments: { file: string; sha: string; count: number; verified?: unknown }[] = [],
    writeCounts = saves.map((s) => ({
      account: s.name,
      offered: 0,
      done: 0,
      burst: 0,
      lat: [] as number[],
    })),
    readers = Array.from({ length: 64 }, () => 0);
  let failure: unknown;
  for (let base = 0; base < count; base += 30) {
    const offers: AuditOffer[] = [],
      raw: RawDecision[] = [];
    await measured(async () => {
      const opened = performance.now(),
        start = opened + 2100;
      const schedule = Array.from({ length: Math.min(30, count - base) }, (_, j) => ({
        id: "audit-publish-" + (base + j),
        order: base + j,
        scheduled: start + j * 1000,
      }));
      fs.writeFileSync(
        path.join(dir, "schedule-" + base + ".json"),
        JSON.stringify({ binding, mode, schedule }) + "\n",
        { flag: "wx" },
      );
      let running = true;
      const ingress = new OrderedSaves();
      function capture(route: Route, id: string, phase: RawDecision["phase"], offer?: number) {
        const invoked = performance.now();
        return route.read(id).then(
          (d) => {
            raw.push({
              route: route.name,
              id,
              phase,
              offer,
              invoked,
              returned: performance.now(),
              position: d.position,
              seq: d.seq,
              raw: W0.outputJson(d.output),
            });
          },
          (e) => {
            failure ??= e;
          },
        );
      }
      const writes = saves.map(async (s, j) => {
        const stats = writeCounts[j]!;
        let steady = 0,
          burst = 0;
        while (running && !failure) {
          const regular = steady * 625,
            wave = 1000 + Math.floor(burst / 55) * 30000 + ((burst % 55) * 1000) / 55,
            surging = wave <= regular,
            due = opened + Math.min(wave, regular);
          if (due > performance.now()) {
            await delay(Math.min(20, due - performance.now()));
            continue;
          }
          if (surging) {
            burst++;
            stats.burst++;
          } else steady++;
          const i = stats.offered++;
          void ingress.submit(s.name, async () => {
            try {
              await s.write(i, recordSave);
              stats.done++;
              stats.lat.push(performance.now() - due);
            } catch (e) {
              failure ??= e;
            }
          });
        }
      });
      const background = readers.map(async (_, j) => {
        while (running && !failure) {
          const id = ordinary[(j * 103 + readers[j]! * 191) % ordinary.length]!;
          await capture(routes[0]!, id, "traffic");
          readers[j]!++;
        }
      });
      const pending: Promise<unknown>[] = [];
      let serial: Promise<unknown> = Promise.resolve();
      try {
        for (const { order: i, id, scheduled } of schedule) {
          await waitsUntil(scheduled);
          const ingressAt = performance.now(),
            intended = unseenRelease(i),
            o: AuditOffer = {
              ...intended,
              order: i,
              id,
              scheduled,
              ingress: ingressAt,
              mode,
            };
          offers.push(o);
          const pair = i % 4 === 1 ? withheld.slice(0, 2) : withheld.slice(2),
            witnesses = [...pair, ordinary[(i * 397 + 17) % ordinary.length]!];
          pending.push(
            waitsUntil(scheduled + 1000).then(() =>
              Promise.all(
                routes.flatMap((r) => witnesses.map((s) => capture(r, s, "deadline", i))),
              ),
            ),
          );
          const admitted = serial.then(async () => {
            try {
              const doc = W0.compileRelease(o.doc);
              assert(!seen.has(doc.hash), "offered release had already been seen");
              seen.add(doc.hash);
              const ack = await a.seal(o.id, doc, { durability: mode });
              assert(!ack.retry);
              o.ack = {
                at: performance.now(),
                position: ack.position,
                txId: ack.txId,
                seq: ack.seq,
              };
              if (mode === "record") o.owed = { at: o.ack.at, position: ack.position };
              const matched = native.filter(
                (x) =>
                  x.command === a.db.entity("cmd:fence:" + o.id) ||
                  x.command === a.db.entity("cmd:event:" + o.id),
              );
              assert(
                matched.length === 2 && matched.every((x) => x.ok),
                "ordinary traffic invalidated a seal",
              );
              o.queuedForSaveMs = matched.reduce((n, x) => n + x.queuedForSaveMs, 0);
              o.nativeMs = matched.reduce((n, x) => n + x.serviceMs, 0);
            } catch (e) {
              o.error = String(e);
            }
          });
          serial = admitted;
          pending.push(
            admitted.then(async () => {
              if (!o.ack || o.error) return;
              const ack = o.ack;
              const read = Promise.all(
                routes.flatMap((r) => witnesses.map((s) => capture(r, s, "first", i))),
              );
              try {
                if (mode === "stored") {
                  const result = await persistPublication(a, ack.seq, ack.position);
                  o.stored = { at: result.at, position: result.position };
                  o.owed = result.lastNotice;
                }
              } catch (e) {
                o.error = String(e);
              }
              await read;
            }),
          );
        }
        await Promise.all(pending);
      } finally {
        running = false;
        await Promise.all([...writes, ...background]);
        await ingress.drain();
      }
    });
    const file = "reads-" + base + ".ndjson.gz",
      bytes = gzipSync(raw.map((x) => JSON.stringify(x)).join("\n") + "\n");
    fs.writeFileSync(path.join(dir, file), bytes, { flag: "wx" });
    fs.writeFileSync(
      path.join(dir, "offers-" + base + ".json"),
      JSON.stringify({ binding, offers }) + "\n",
      { flag: "wx" },
    );
    if (failure) throw failure;
    segments.push({ file, sha: hash(bytes.toString("base64")), count: raw.length });
    all.push(...offers);
  }
  const reports = [];
  for (const [i, s] of segments.entries()) {
    const base = i * 30,
      turns = all.slice(base, base + 30).map((o) => ({ ...o, order: o.order - base }));
    const reads: RawDecision[] = gunzipSync(fs.readFileSync(path.join(dir, s.file)))
      .toString()
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    // [DX-ACT2] Why: neither the oracle nor a roster verification warms the measured routes between offers. Rejected: awaiting verification in the offer scheduler.
    s.verified = await verify(all.slice(base, base + 30), reads);
    reports.push(
      scoreClock(
        turns,
        reads.map((r) => ({ ...r, offer: r.offer === undefined ? undefined : r.offer - base })),
        routeNames,
        mode,
      ),
    );
  }
  assert.equal(all.length, count);
  assert(readers.every((n) => n > 0));
  const latency = reports.flatMap((r) =>
    r.offers.flatMap((x) => (x.done === null ? [] : [x.done])),
  );
  const result = {
    binding,
    mode,
    routeNames,
    count,
    segments,
    readers,
    all,
    reports,
    p99: latency.length === count ? percentile(latency, 0.99) : null,
    misses: reports.reduce((n, r) => n + r.misses, 0),
    stale: reports.reduce((n, r) => n + r.stale, 0),
    saves: writeCounts.map(({ lat, ...s }) => ({
      ...s,
      p99: lat.length ? percentile(lat, 0.99) : null,
    })),
  };
  fs.writeFileSync(path.join(dir, "timings.json"), JSON.stringify(result) + "\n", { flag: "wx" });
  return result;
}
