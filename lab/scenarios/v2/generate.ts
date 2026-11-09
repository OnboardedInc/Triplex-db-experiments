// [EXP-W02] Why: W0 owns every business attribute and the background schedule. Rejected:
// translating unknown W01 attributes to ballast (would silently remove the scenario's domain claim).
import { createHash } from "node:crypto";
import fs from "node:fs";
import { generateTrace, TRACE_DEFAULTS } from "../../bench/lib/trace.ts";
import { mapW0Trace } from "../../bench/lib/w0-trace.ts";
import { W0, V_W0, canonical, triplexValue } from "../../bench/lib/w0-world.ts";
export const VERSION = "W02/1";
export const RUNGS: Record<string, number> = { smoke: 500, "1k": 1000, "10k": 10000, "100k": 100000, "1m": 1000000, "10m": 10000000 };
export const hash = (x: string | Uint8Array) => createHash("sha256").update(x).digest("hex");
export function generatorIdentity() {
  const files = ["lab/scenarios/v2/generate.ts", "lab/bench/lib/trace.ts", "lab/bench/lib/rng.ts", "lab/bench/lib/w0-trace.ts", "lab/bench/lib/w0-world.ts", "lab/bench/lib/w0-seed.ts"];
  return hash(canonical(files.map(f => [f, hash(fs.readFileSync(new URL("../../../" + f, import.meta.url)))])));
}
type Row = readonly [string, string, any];
export interface Event {
  id: string; stream: "background" | "scenario"; atMs: number; subject: string;
  rows: readonly Row[]; validFrom: number; resend?: boolean; ackLoss?: boolean;
  action?: string; race?: string; validTo?: number;
}
export function generateScenario(spec: any, N: number, durationS = 240) {
  if (!Number.isFinite(durationS) || durationS < 180) throw Error("GS window must contain the full 120-180 s burst");
  const R = W0.rung(N), id = Number(spec.id), seed = String(spec.seed);
  if (!Number.isInteger(id) || id < 1 || id > 20) throw Error("unknown GS scenario");
  const background: Event[] = generateTrace({ seed, subjects: N, durationS }).map(ev => {
    const m = mapW0Trace(ev);
    return { id: m.commandId, stream: "background", atMs: ev.atMs, subject: W0.placementId(ev.subject), rows: m.rows,
      validFrom: m.validFrom, resend: ev.resend, ackLoss: ev.ackLoss };
  });
  // Overlay subjects are members of the same population as the background, never a private toy world.
  const params = { ...spec.params, ...spec.rungs?.[N === 500 ? "smoke" : String(N / 1000) + "k"] };
  const wanted = spec.yearOne?.subjects ?? spec.yearOne?.placements ?? params.subjects ?? params.placements ?? params.fanout ?? 50;
  const count = Math.max(1, Math.min(Number(wanted), N - 1));
  const positives = Array.from({ length: count }, (_, i) => W0.placementId(i));
  const negatives = [W0.placementId(N - 1)];
  const overlay: Event[] = [];
  const add = (subject: string, rows: readonly Row[], n: number, extra: Partial<Event> = {}) => {
    const ev: Event = { id: `gs:${id}:${overlay.length}`, stream: "scenario", atMs: 30_000 + n / count * 60_000,
      subject, rows, validFrom: V_W0, ...extra };
    overlay.push(ev); return ev;
  };
  const decision = (S: string, n: number, author = "person", verdict = "approve", target = "i9.section2"): Row[] => {
    const d = `${S}/dec:gs${id}-${n}`;
    return [[S, "decisions", d], [d, "target", target], [d, "verdict", verdict], [d, "author", author]];
  };
  for (const [n, S] of positives.entries()) {
    switch (id) {
      case 1: case 2: {
        // Ten assertions: Section 1's two inputs and eight reachable W0 answer facts.
        const rows: Row[] = [[S, "section1AttestedAt", W0.POPULATION_VALID_TIME], [S, "ssn", "123456789"]];
        for (let k = 0; k < 2; k++) { const a = `${S}/ans:gs${id}-${k}`; rows.push([S, "answers", a], [a, "field", "form"], [a, "value", "submitted"], [a, "next", `${S}/ans:gs${id}-end${k}`]); }
        add(S, rows, n); break;
      }
      case 3: {
        const ev = add(S, [[S, "everifyStatus", "authorized"], [S, "everifyStatusAt", W0.POPULATION_VALID_TIME]], n);
        overlay.push({ ...ev, atMs: ev.atMs + 100, resend: true });
        add(S, [], n, { atMs: ev.atMs + 200, action: "superseded-revision" }); break;
      }
      case 4: { const ev = add(S, [[S, "bgcStatus", "clear"]], n, { ackLoss: true }); overlay.push({ ...ev, atMs: ev.atMs + 100, resend: true }); break; }
      case 5: add(S, [[S, "bgcStatus", n % 2 ? "clear" : "consider"]], n); break;
      case 6: add(S, decision(S, n), n); break;
      case 7: {
        const race = `review:${n}`;
        const ev = add(S, decision(S, n), n, { race });
        add(S, decision(S, n + count, "person", "waive"), n, { atMs: ev.atMs, race }); break;
      }
      case 8: add(S, [[S, "payRateCents", 1650]], n, { validFrom: V_W0 - 30 * 86400000 }); break;
      case 9: add(S, [[S, "startDate", n % 2 ? "2026-11-01" : "2026-11-16"]], n); break;
      case 10: case 11: add(S, [], n, { action: id === 10 ? "activate-and-sweep" : "preview-at-common-basis" }); break;
      case 12: add(S, [[S, "payRateCents", 1650]], n); break;
      case 13: {
        const rows: Row[] = []; for (let k = 0; k < 10; k++) { const a = `${S}/ans:bulk-${k}`; rows.push([S, "answers", a], [a, "field", "import"], [a, "value", String(n)]); }
        add(S, rows, n, { action: "throttled-bulk" }); break;
      }
      case 14: case 15: add(S, [[S, "weeklyMinutes", 2400]], n, { action: "tenant-storage" }); break;
      case 16: add(S, [], n, { action: "erase-pinned-rebuild-restore" }); break;
      case 17: {
        for (let k = 0; k < 5; k++) add(S, decision(S, n * 5 + k, "agent"), n, { atMs: 30_000 + n / count * 60_000 + k });
        add(S, decision(S, count * 5 + n), n, { atMs: 90_000 + n }); break;
      }
      case 18: add(S, decision(S, n), n); break;
      case 19: add(S, [[S, "everifySubmitResult", "accepted"]], n, { action: "outbox-crash" }); break;
      case 20: {
        const d = `${S}/doc:gs20`;
        add(S, [[S, "documents", d], [d, "docType", "ead"], [d, "expiresOn", "2026-11-05"]], n);
        break;
      }
    }
  }
  if (id === 6) add(W0.jurisdictionId(R, 1), [[W0.jurisdictionId(R, 1), "stateMinWageCents", 1850]], count, { action: "shared-reference" });
  // Unholdable numbers are an explicitly invalid probe, separate from W0-valid business commands.
  const probes = id === 12 ? [{ case: "GS-NUM-UNHOLDABLE", subject: positives[0], value: "9223372036854775808", expected: "InvalidTripleError" }] : [];
  const events = [...background, ...overlay].sort((a, b) => a.atMs - b.atMs || a.stream.localeCompare(b.stream) || a.id.localeCompare(b.id));
  return { version: VERSION, seed, N, durationS, sourceSha256: generatorIdentity(), traceParams: TRACE_DEFAULTS,
    events, probes, witnesses: { positive: positives, negative: negatives },
    streamSha256: hash(JSON.stringify(events)), background: background.length, overlay: overlay.length };
}
export function operations(event: Event) {
  return event.rows.map(([entityId, attribute, value]) => ({ op: "assert", entityId, attribute, value: triplexValue(attribute, value), validFrom: event.validFrom,
    ...(event.validTo === undefined ? {} : { validTo: event.validTo }) }));
}
