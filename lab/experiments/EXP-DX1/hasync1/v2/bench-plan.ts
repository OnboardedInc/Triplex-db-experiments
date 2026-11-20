import type { Mode } from "../../ha1/common.ts";

export const subjects = 100000;
export const workingMs = 85 * 60000;
export const seeds = {
  full: { mode: "hasync-seed-edited", people: subjects, sourceOnB: false },
  small: { mode: "hasync-seed-edited", people: 740, sourceOnB: true },
  medium: { mode: "hasync-seed-edited", people: 6300, sourceOnB: true },
  cost: { mode: "hasync-seed-lean", people: 740, sourceOnB: true },
} as const;
type SeedKey = keyof typeof seeds;
type Trial = { mode: Mode; people: number; systems: number; checkpoint?: SeedKey };
const small = (mode: Mode, systems = 1): Trial => ({ mode, people: 8, systems });
const seeded = (mode: Mode, checkpoint: SeedKey): Trial => ({
  mode,
  checkpoint,
  people: seeds[checkpoint].people,
  systems: 1,
});

export const benchTrials = [
  ...(["full", "small", "medium", "cost"] as const).map((key) => seeded(seeds[key].mode, key)),
  ...(["hasync-fleet-shared", "hasync-fleet-dedicated"] as const).flatMap((mode) =>
    [1, 4, 10].map((systems) => small(mode, systems)),
  ),
  ...(["small", "medium", "full"] as const).flatMap((key) =>
    (["hasync-ack", "hasync-index", "hasync-move"] as const).map((mode) => seeded(mode, key)),
  ),
  small("hasync-cut-wal"),
  small("hasync-cut-reply"),
  seeded("hasync-cost-plain", "cost"),
  seeded("hasync-cost-group", "cost"),
] as const;
