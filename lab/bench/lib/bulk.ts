/**
 * Continue from a bulk-seeded scope (lab/bench/qlever-bulk-seed.ts): rebuild the driver's SeedResult from the
 * manifest and check the live engine holds that seed (its position is the manifest's last position).
 */
import type { CompositionHandle } from "./composition.ts";
import type { SeedResult } from "./seed.ts";
import { SEED_VALID_FROM, seedAddress } from "./world.ts";

export async function seedFromManifest(m: any, comp: CompositionHandle, log: (l: string) => void): Promise<SeedResult> {
  const position = await comp.currentPosition();
  if (position !== m.result.lastPosition)
    throw new Error(`bulk seed: engine position ${position} differs from the manifest's ${m.result.lastPosition}; index the manifest's seed.nq into a fresh slot first`);
  const state = new Map(m.result.state.map(([i, stampId, addressId]: [number, string, string]) => [i, { stamp: 0, stampId, stampValidFrom: SEED_VALID_FROM, address: seedAddress(i), addressId, addressValidFrom: SEED_VALID_FROM }]));
  log(`seed: bulk-indexed scope ${m.scope}, ${m.result.seededSubjects} subjects, position ${position}`);
  return {
    seededSubjects: m.result.seededSubjects, complete: m.result.complete, commands: m.result.commands, assertions: m.result.assertions, retractions: 0,
    wallMs: m.capture.wallS * 1000, factsPerS: m.result.assertions / Math.max(m.capture.wallS, 1e-9), commitMs: { p50: 0, max: 0 }, failures: [],
    firstPosition: m.result.firstPosition, lastPosition: m.result.lastPosition, lastInstant: m.result.lastInstant,
    positions: [], state: state as any, versionIds: new Map(m.result.versionIds), recorded: m.recorded ?? [],
  };
}
