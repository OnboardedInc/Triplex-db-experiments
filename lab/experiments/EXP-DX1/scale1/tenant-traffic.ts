import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  makeDeepTrace,
  deepSeed,
  deepEdits,
  DEEP_RATE,
  type DeepEvent,
} from "../../../bench/lib/deep-trace.ts";
import { Rng, seedOf } from "../../../bench/lib/rng.ts";
import { liveProfile, liveWindows, liveEdits, liveArrivals, geometryHash } from "./deep-live.ts";
import { smallPhases } from "./small-plan.ts";
import {
  tenantAccounts,
  tenantPopulationHash,
  tenantSeedPin,
  type Account,
  type TenantEvent,
  type TenantSpec,
} from "./tenants.ts";
import { nsPlan, V3_OFFER_SECONDS, type PhaseSpec } from "../../../bench/lib/phases.ts";
import { frozenDeep } from "../../../bench/lib/deep-profile.ts";
import { fieldRates } from "../int1/field-plan.ts";
export type TenantWindow = {
  name: string;
  from: number;
  seconds: number;
  active: number;
  pattern: "steady" | "one-neighbor" | "nine-neighbors" | "all" | "activation" | "low" | "busy-low";
  readers: number;
  activated?: boolean;
  rates?: number[];
  seats?: number[];
};
export const tenantTraceId = "deep-tenants/1";
export const pooledCampaignId = "int1-pooled/1";

export function campaignWindows(s: TenantSpec, arm: string): TenantWindow[] {
  assert(s.campaign && ["zero", "reader"].includes(arm));
  const smoke = s.study === "smoke";
  if (s.campaign === "frozen" && !smoke) {
    return nsPlan("v3", arm === "zero").flatMap((p) =>
      p.traceFromS === undefined ? [] : [{
        name: p.name, from: p.traceFromS, seconds: p.seconds!, active: 1,
        pattern: "steady", readers: p.readers, seats: [p.readers],
      }],
    );
  }
  let from = 0;
  const windows: TenantWindow[] = [];
  const add = (name: string, seconds: number, readers: number, quiet: number, neighborRate: number) => {
    if (arm === "zero") readers = quiet = 0;
    const seats = [quiet, ...Array.from({ length: 9 }, (_, i) =>
      Math.floor((readers - quiet) / 9) + Number(i < (readers - quiet) % 9),
    )];
    const rates = [fieldRates.steady[0], ...Array<number>(9).fill(neighborRate)];
    windows.push({
      name, from, seconds, active: neighborRate > 0 ? 10 : 1, pattern: "steady",
      readers, seats, rates,
    });
    from += seconds;
  };
  if (s.campaign === "frozen") {
    add("L4", 30, 4, 4, 0);
    return windows;
  }
  // [DX-THIN1] Why: quiet lanes keep identical seats and offer offsets while neighbors change.
  // Rejected: comparing the quiet lane's alone reads with all-reader aggregates.
  const matched = smoke ? 8 : 300;
  add("quiet-alone", matched, smoke ? 1 : 8, smoke ? 1 : 8, 0);
  add("neighbors-64", matched, smoke ? 4 : 64, smoke ? 1 : 8, smoke ? 3.5 : 23.5);
  add("neighbors-256", matched, smoke ? 8 : 256, smoke ? 1 : 8, smoke ? 3.5 : 39.4);
  add("publish-control", matched, smoke ? 4 : 64, smoke ? 1 : 8, 3.5);
  add("publish", matched, smoke ? 4 : 64, smoke ? 1 : 8, 3.5);
  const importSeconds = smoke ? 12 : s.study === "million" ? 5100 : 720;
  add("import-control", matched, smoke ? 4 : 64, smoke ? 1 : 8, 4.9);
  add("import", matched, smoke ? 4 : 64, smoke ? 1 : 8, 4.9);
  add("import-tail", importSeconds - matched, smoke ? 4 : 64, smoke ? 1 : 8, 4.9);
  return windows;
}

export function tenantWindows(s: TenantSpec, arm: string): TenantWindow[] {
  if (s.campaign) return campaignWindows(s, arm);
  if (s.live) {
    assert(s.study === "interference" && arm === "interference");
    return liveWindows(s.live);
  }
  const list: TenantWindow[] = [];
  if ((s.study === "million" || s.study === "interference") && arm === "seed") return list;
  let from = 0;
  const add = (
    name: string,
    seconds: number,
    active: number,
    pattern: TenantWindow["pattern"],
    readers: number,
  ) => {
    list.push({ name, from, seconds, active, pattern, readers });
    from += seconds;
  };
  if (s.study === "million" && (arm === "zero" || arm === "reader")) {
    for (const p of nsPlan("v3", arm === "zero")) {
      if (p.traceFromS === undefined) continue;
      assert(p.seconds && p.traceFromS === from);
      add(p.name, p.seconds, 10, "steady", p.readers);
    }
    add("fixed-tail", V3_OFFER_SECONDS - from, 10, "steady", arm === "zero" ? 0 : 64);
    return list;
  }
  if (s.study === "million") {
    add("presweep", 360, 10, "steady", 64);
    add("activation", 3600, 10, "activation", 64);
    return list;
  }
  if (s.study === "small") {
    for (const [i, p] of smallPhases(0).entries())
      add(p.name, p.seconds, i === 0 ? 1 : 100, i === 2 ? "low" : "busy-low", 16);
    return list;
  }
  if (s.study === "smoke") {
    add("one", 4, 1, "steady", 2);
    add("two", 8, 2, "steady", 2);
    return list;
  }
  for (const n of [1, 2, 5, 10])
    add(["one", "two", "", "", "five", "", "", "", "", "ten"][n - 1]!, 360, n, "steady", 64);
  for (const mode of ["one-neighbor", "nine-neighbors", "all"] as const) {
    add(mode + "-before", 120, 10, "steady", 64);
    add(mode + "-burst", 60, 10, mode, 64);
    add(mode + "-recovery", 180, 10, "steady", 64);
  }
  add("activation", 3600, 10, "activation", 64);
  return list;
}
export const tenantReaders = (w: TenantWindow, i: number) =>
  w.seats ? w.seats[i] ?? 0 :
    i >= w.active ? 0 : w.pattern === "low" || (w.pattern === "busy-low" && i !== 0) ? 1 : w.readers;
export function tenantPhases(
  spec: TenantSpec,
  arm: string,
): (PhaseSpec & { seconds: number; traceFromS: number })[] {
  const acc = tenantAccounts(spec);
  return tenantWindows(spec, arm).map((w) => ({
    name: w.name,
    seconds: w.seconds,
    traceFromS: w.from,
    measured: true,
    readers: acc.reduce((sum, a) => sum + tenantReaders(w, a.index), 0),
    mode: "mixed",
  }));
}
function perTenant(a: Account, s: TenantSpec, arm: string) {
  // [DX-SCALE1] Why: a seed-only grant has no live offers or readers. Rejected: allocating a ten-account live trace when only the population and its native growth are measured.
  if ((s.study === "million" || s.study === "interference") && arm === "seed") return [];
  const windows = tenantWindows(s, arm);
  if (s.campaign === "frozen") {
    if (a.index !== 0) return [];
    if (s.study === "smoke") {
      // [DX-THIN1] Why: the short fixture exercises a genuine mapped frozen save tape without altering the long trace.
      // Rejected: counting a planned event as a native smoke save.
      return makeDeepTrace(deepSeed(0), a.people, 30).events;
    }
    return frozenDeep(0, a.people).events.filter((e) => e.atMs < V3_OFFER_SECONDS * 1000);
  }
  const plain = makeDeepTrace(
    deepSeed(a.index),
    a.people,
    s.live || s.campaign ? 10800 : s.study === "smoke" || s.study === "small" ? 450 : 7200,
  );
  if (s.study === "million" && (arm === "zero" || arm === "reader"))
    return plain.events.filter((e) => e.atMs < V3_OFFER_SECONDS * 1000);
  const originals = plain.events.filter((e) => !e.resend),
    resends = new Map(plain.events.filter((e) => e.resend).map((e) => [e.seq, e]));
  let issued = 0;
  const events: DeepEvent[] = [];
  for (const w of windows) {
    if (a.index >= w.active) continue;
    const low = w.pattern === "low" || (w.pattern === "busy-low" && a.index !== 0),
      burst =
        (w.rates !== undefined && w.rates[a.index]! > 3.5) ||
        w.pattern === "all" ||
        (w.pattern === "one-neighbor" && a.index === 1) ||
        (w.pattern === "nine-neighbors" && a.index !== 0);
    const rng = new Rng(
        seedOf(
          tenantTraceId + "/arrivals/" + a.index + "/" + (low ? "low" : burst ? "burst" : "steady"),
        ),
      ),
      rate = DEEP_RATE * (burst ? 50 : 1);
    const put = (seconds: number) => {
      const base = originals[issued++]!;
      assert(base, "Insufficient frozen business intents");
      const atMs = w.from * 1000 + Math.round(seconds * 1e6) / 1000;
      const facts = s.live || s.campaign === "field"
        ? 1 +
          Number(base.correction) +
          liveEdits(base.subject, base.seq, base.kind, base.deep).length
        : base.facts;
      events.push({ ...base, facts, atMs, burst });
      const r = resends.get(base.seq);
      if (r) {
        const retryAt = atMs + r.atMs - base.atMs;
        if (retryAt < (windows.at(-1)!.from + windows.at(-1)!.seconds) * 1000)
          events.push({ ...r, facts, atMs: retryAt, burst });
      }
    };
    if (w.rates && s.campaign) {
      const offered = w.rates[a.index]!;
      if (offered > 0) {
        const rng = new Rng(seedOf(`${pooledCampaignId}/${a.index}/${offered}`));
        const n = Math.round(w.seconds * offered);
        for (let j = 0; j < n; j++) put((j + rng.next()) / offered);
      }
    } else if (w.rates) liveArrivals(a.index, w.rates[a.index]!, w.seconds, put);
    else if (low) {
      for (let min = 0; min < w.seconds / 60; min++) put(min * 60 + 2 + rng.next() * 50);
    } else for (let t = rng.exp(rate); t < w.seconds; t += rng.exp(rate)) put(t);
  }
  return events;
}
// [DX-SCALE1] Why: the two topologies consume the identical tenant-local intents, dates and offered intervals. Rejected: aggregating per-account rates into a single synthetic sender or using different worlds for the comparison.
export function tenantPlan(spec: TenantSpec, arm: string, checkPin = true) {
  const accounts = tenantAccounts(spec),
    events: TenantEvent[] = [],
    logical: Record<string, string> = {},
    h = createHash("sha256"),
    sizes = new Map<number, number>();
  let n = 0;
  for (const a of accounts) {
    const dig = createHash("sha256");
    for (const e of perTenant(a, spec, arm)) {
      dig.update(
        JSON.stringify([
          e,
          e.resend ? null : (spec.live || spec.campaign === "field" ? liveEdits : deepEdits)(e.subject, e.seq, e.kind, e.deep),
        ]) + "\n",
      );
      events.push({
        ...e,
        tenant: a.index,
        localSubject: e.subject,
        localSeq: e.seq,
        subject: a.first + e.subject,
        seq: spec.campaign === "frozen" ? e.seq : e.seq * 100 + a.index,
      });
      if (!e.resend) {
        n++;
        sizes.set(e.facts, (sizes.get(e.facts) ?? 0) + 1);
      }
    }
    logical[a.key] = dig.digest("hex");
  }
  events.sort((a, b) => a.atMs - b.atMs || a.seq - b.seq || Number(a.resend) - Number(b.resend));
  h.update(
    JSON.stringify({ spec, arm: arm === "zero" || arm === "reader" ? "regular" : arm, logical }),
  );
  if (checkPin && spec.live) {
    const pin = JSON.parse(
      fs.readFileSync(new URL("./deep-live-pins.json", import.meta.url), "utf8"),
    )[spec.live];
    assert(pin.profile === liveProfile && pin.geometry === geometryHash(tenantWindows(spec, arm)));
    for (const a of accounts) assert.equal(logical[a.key], pin.logical[a.key]);
  } else if (checkPin && !spec.campaign) {
    const geometry = JSON.parse(
      fs.readFileSync(new URL("./tenant-windows.json", import.meta.url), "utf8"),
    );
    assert.equal(
      createHash("sha256")
        .update(JSON.stringify(tenantWindows(spec, arm)))
        .digest("hex"),
      geometry[spec.study + "/" + arm],
      "Tenant window geometry differs from the frozen plan",
    );
    const pins = JSON.parse(
      fs.readFileSync(new URL("./tenant-traces.json", import.meta.url), "utf8"),
    );
    for (const a of accounts) assert.equal(logical[a.key], pins[spec.study + "/" + arm][a.key]);
  }
  return {
    accounts,
    events,
    logical,
    sha256: h.digest("hex"),
    populationSha256: checkPin
      ? spec.campaign && spec.study === "smoke" ? tenantPopulationHash(spec) : tenantSeedPin(spec)
      : "",
    activeSubjects: new Set(events.map((e) => e.subject)),
    sizeClasses: [...sizes]
      .sort(([a], [b]) => a - b)
      .map(([min, count]) => ({ min, max: min, share: count / n })),
  };
}
