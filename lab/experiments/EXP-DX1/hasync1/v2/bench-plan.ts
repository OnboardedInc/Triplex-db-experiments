import type { Mode } from "../../ha1/common.ts";

export const subjects = 100000;
const leanSubjects = 740;
export const workingMs = 85 * 60000;
const small = (mode: Mode, people = 8, systems = 1) => ({ mode, people, systems });

export const benchTrials = [
  small("hasync-seed-edited", subjects),
  small("hasync-seed-lean", leanSubjects),
  small("hasync-ack", subjects),
  small("hasync-index", subjects),
  small("hasync-move", subjects),
  ...(
    [
      "hasync-commit",
      "hasync-import",
      "hasync-cut-wal",
      "hasync-cut-reply",
      "hasync-restart",
    ] as const
  ).map((mode) => small(mode)),
  ...(["hasync-fleet-shared", "hasync-fleet-dedicated"] as const).flatMap((mode) =>
    [1, 4, 10].map((systems) => small(mode, 8, systems)),
  ),
  small("hasync-cost-plain", leanSubjects),
  small("hasync-cost-group", leanSubjects),
] as const;
