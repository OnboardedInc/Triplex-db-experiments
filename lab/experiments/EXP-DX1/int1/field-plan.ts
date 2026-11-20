import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { V3_OFFER_SECONDS } from "../../../bench/lib/phases.ts";
import { frozenDeep } from "../../../bench/lib/deep-profile.ts";
import type { DeepEvent } from "../../../bench/lib/deep-trace.ts";
import { Rng, seedOf } from "../../../bench/lib/rng.ts";
import { segments } from "../../../bench/lib/trace.ts";
import { liveEdits } from "../scale1/deep-live.ts";

export const fieldProfile = "int1-field/1";
export const fieldRates = { steady: [3.5, 4.9], busy: [23.5, 39.4] } as const;

export function fieldWindows(duration: number) {
  let busy = 0,
    steady = 0;
  return segments(duration).map((window) => ({
    ...window,
    rate: window.burst ? fieldRates.busy[busy++ % 2]! : fieldRates.steady[steady++ % 2]!,
  }));
}

export function fieldPlan(account: number, people: number, smoke = false) {
  const base = frozenDeep(account, people),
    duration = smoke ? 30 : V3_OFFER_SECONDS;
  const rng = new Rng(seedOf(`${fieldProfile}/${account}/${people}`));
  const original = base.events.filter((e) => !e.resend);
  const duplicateDelay = new Map<number, number>();
  const originalBySeq = new Map(original.map((e) => [e.seq, e.atMs]));
  for (const e of base.events)
    if (e.resend) duplicateDelay.set(e.seq, e.atMs - originalBySeq.get(e.seq)!);
  const events: DeepEvent[] = [],
    sizes = new Map<number, number>(),
    subjects = new Set<number>();
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify([fieldProfile, account, people, duration, fieldRates, base.populationSha256]),
  );
  let index = 0;
  // [DX-THIN1] Why: keep the same deep population and edit intents while offering field-sized saves at the observed per-account rates.
  // Rejected: multiplying the frozen load or assuming all saves consist of only a business field.
  for (const window of fieldWindows(duration)) {
    const { rate } = window;
    for (let t = window.start + rng.exp(rate); t < window.end; t += rng.exp(rate)) {
      const prior = original[index++];
      assert(prior, "Field schedule exhausted its bound deep intents");
      const edits = liveEdits(prior.subject, prior.seq, prior.kind, prior.deep);
      const event = {
        ...prior,
        atMs: Math.round(t * 1e6) / 1000,
        burst: window.burst,
        facts: 1 + edits.length + Number(prior.correction),
      };
      events.push(event);
      sizes.set(event.facts, (sizes.get(event.facts) ?? 0) + 1);
      subjects.add(event.subject);
      hash.update(JSON.stringify([event, edits]) + "\n");
      const after = duplicateDelay.get(event.seq);
      if (after !== undefined && event.atMs + after < duration * 1000) {
        const duplicate = {
          ...event,
          resend: true,
          ackLoss: false,
          atMs: Math.round((event.atMs + after) * 1000) / 1000,
        };
        events.push(duplicate);
        hash.update(JSON.stringify(duplicate) + "\n");
      }
    }
  }
  events.sort((a, b) => a.atMs - b.atMs || a.seq - b.seq || Number(a.resend) - Number(b.resend));
  return {
    events,
    populationSha256: base.populationSha256,
    sha256: hash.digest("hex"),
    activeSubjects: subjects,
    sizeClasses: [...sizes]
      .sort(([a], [b]) => a - b)
      .map(([n, count]) => ({ min: n, max: n, share: count / index })),
  };
}
