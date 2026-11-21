import type { Mode } from "../../ha1/common.ts";

export const subjects = 6300;
export const workingMs = 55 * 60000;
export const seeds = {
  small: { mode: "hasync-seed-edited", people: 740, sourceOnB: true },
  medium: { mode: "hasync-seed-edited", people: subjects, sourceOnB: true },
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
  ...(["hasync-fleet-shared", "hasync-fleet-dedicated"] as const).flatMap((mode) =>
    [1, 4, 10].map((systems) => small(mode, systems)),
  ),
  ...(["small", "medium"] as const).flatMap((key) =>
    ([seeds[key].mode, "hasync-ack", "hasync-index", "hasync-move"] as const).map((mode) =>
      seeded(mode, key),
    ),
  ),
] as const;

export function cellBudgetMs(trial: Trial) {
  if (trial.mode === "hasync-seed-edited") return (trial.people === subjects ? 8 : 3) * 60000;
  if (trial.mode.startsWith("hasync-fleet-")) return (trial.systems === 10 ? 4 : 2) * 60000;
  return (trial.people === subjects ? 4 : 3) * 60000;
}
