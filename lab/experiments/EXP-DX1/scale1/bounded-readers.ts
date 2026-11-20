import assert from "node:assert/strict";
import type { PhaseSpec } from "../../../bench/lib/phases.ts";
import type { DeepIdentity } from "../../../bench/lib/deep-profile.ts";
import { tenantPhases } from "./tenant-traffic.ts";

export const READER_COUNT = 64;
export const READER_CORES = "5,6";
export const READER_SECONDS = 600;
export const RECORD_EVERY = 100;
export const BOUNDED_READER_PLAN = "deep-bounded/1";

export function readerWindow(id: DeepIdentity) {
  if (!id.bounded || id.account !== 0 || id.arm === "seed" || id.arm === "zero") return;
  const last = id.tenant?.live ? tenantPhases(id.tenant, id.arm).at(-1) : undefined;
  // [DX-SCALE1] Why: the last of the three frozen peak repetitions supplies a matched ten-minute reader window. Rejected: mixing readers into the earlier writer-capacity steps.
  const from = last ? last.traceFromS + last.seconds - READER_SECONDS : 0;
  assert(from >= 0);
  return { from, to: from + READER_SECONDS };
}

export function boundedPhases(id: DeepIdentity): PhaseSpec[] {
  assert(id.bounded && id.arm !== "seed");
  const readers = readerWindow(id) ? READER_COUNT : 0;
  if (id.arm === "zero" || id.arm === "reader") {
    return [
      {
        name: id.arm === "reader" ? "bounded-readers" : "zero",
        seconds: READER_SECONDS,
        traceFromS: 0,
        readers,
        measured: true,
        mode: "mixed",
      },
    ];
  }
  if (!id.tenant)
    return [
      { name: "presweep", traceFromS: 0, readers, seconds: 100, measured: true, mode: "mixed" },
      { name: "activation", traceFromS: 100, readers, measured: true, mode: "mixed" },
    ];
  const window = readerWindow(id);
  return tenantPhases(id.tenant, id.arm).map((p) => ({
    ...p,
    readers:
      window && p.traceFromS < window.to && p.traceFromS + p.seconds > window.from ? readers : 0,
  }));
}
