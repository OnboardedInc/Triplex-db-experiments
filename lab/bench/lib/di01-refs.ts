import type {
  ReferenceReader,
  ReferenceRow,
  DependencyPlan,
  DependencyPath,
} from "../../../packages/host/dist/feed/index.js";
import type { CompositionHandle } from "./composition.ts";
import { W0, visibleRows, factValue, type WorldRow } from "./w0-world.ts";

const wanted = new Set(["location", "jurisdiction", "documents", "decisions", "p5/activation"]);
const refsOf = (rows: readonly WorldRow[], entities: readonly string[]): ReferenceRow[] =>
  rows
    .filter((r) => entities.includes(r.entityId) && wanted.has(r.attribute))
    .map((r) => ({
      entity: r.entityId,
      attribute: r.attribute,
      value: String(factValue(r.value)),
      position: r.position,
      validFrom: r.validFrom,
      ...(r.validTo === undefined ? {} : { validTo: r.validTo }),
      ...(r.retractedPosition === undefined ? {} : { retractedPosition: r.retractedPosition }),
    }));
// [EXP-DI01] Why: replay and memory have the identical one-hop seam as a lane. Rejected: following references here (only changed reference pairs need values).
export const replayReferenceReader =
  (rows: () => readonly WorldRow[]): ReferenceReader =>
  async (entities, position, validAt) =>
    refsOf(visibleRows(rows(), { position, validAt }), entities);
export const memoryReferenceReader =
  (comp: CompositionHandle): ReferenceReader =>
  async (entities, position, validAt) => {
    const page = await comp.sweepPage(entities, { position, validAt });
    if (page.reportedBasis?.position !== position || page.reportedBasis?.validAt !== validAt)
      throw Error("Memory reference basis unavailable");
    return refsOf(page.rows, entities);
  };
export function storageReferenceReader(
  handle: {
    storage: any;
    run: <T>(effect: any) => Promise<T>;
  },
  headOnly = false,
): ReferenceReader {
  return async (entities, position, validAt) => {
    const head = Number(await handle.run(handle.storage.currentCommitPosition()));
    if (!Number.isSafeInteger(head) || head < position || (headOnly && head !== position))
      throw Error("BasisNotAvailable");
    const result = await handle.run<ReadonlyMap<string, readonly any[]>>(
      handle.storage.getByEntities(entities, { recordedPosition: position, validAt }),
    );
    if (headOnly && Number(await handle.run(handle.storage.currentCommitPosition())) !== position)
      throw Error("BasisNotAvailable");
    const rows: ReferenceRow[] = [];
    for (const body of result.values())
      for (const r of body) {
        if (
          !Number.isSafeInteger(Number(r.recorded_position)) ||
          Number(r.recorded_position) < 1 ||
          Number(r.recorded_position) > position ||
          (r.retracted_position != null && Number(r.retracted_position) <= position)
        )
          throw Error("BasisNotAvailable");
        if (!wanted.has(r.attribute)) continue;
        rows.push({
          entity: r.entity_id,
          attribute: r.attribute,
          value: String(r.value_string ?? r.value_json),
          position: Number(r.recorded_position),
          validFrom: Number(r.valid_from),
          ...(r.valid_to == null ? {} : { validTo: Number(r.valid_to) }),
        });
      }
    return rows;
  };
}
// [EXP-DI01] Why: W0's static read sets already live in the compiled evaluator; instantiate them with distinct sentinel references once per release. Rejected: copying the SPEC's attribute table into the consumer (drifts from kernel).
export function dependencyPlan(release: W0.CompiledRelease): DependencyPlan {
  const entities: Record<DependencyPath, string> = {
    subject: "pl:di-plan",
    location: "loc:di-plan",
    jurisdiction: "jur:di-plan",
    documents: "pl:di-plan/doc:1",
    decisions: "pl:di-plan/dec:1",
  };
  const world: W0.World = {
    subject: entities.subject,
    facts: [
      { e: entities.subject, a: "location", v: entities.location, tx: 1 },
      { e: entities.location, a: "jurisdiction", v: entities.jurisdiction, tx: 1 },
      { e: entities.subject, a: "documents", v: entities.documents, tx: 1 },
      { e: entities.subject, a: "decisions", v: entities.decisions, tx: 1 },
    ],
  };
  const result = W0.evaluateWorld(world, release, { tx: 1, validTime: W0.POPULATION_VALID_TIME });
  if (W0.isFailure(result)) throw Error(result.error);
  return {
    release: release.hash,
    pairs: result.dependencies.map(([e, a]) => {
      const path = (Object.keys(entities) as DependencyPath[]).find((k) => entities[k] === e);
      if (!path) throw Error("Unrepresented dependency path");
      return [path, a] as const;
    }),
  };
}
export const dependencyPlans = () => [W0.R1, W0.R2, W0.R3].map(dependencyPlan);
export function resolveActivation(
  values: readonly ReferenceRow[],
  position: number,
  validAt: number,
): string {
  const activations = values.map((r) => ({
    from: new Date(r.validFrom).toISOString().replace(".000Z", ".000000Z"),
    release: r.value,
    tx: r.position,
  }));
  const release = W0.resolveRelease(
    activations,
    new Date(validAt).toISOString().replace(".000Z", ".000000Z"),
  );
  if (typeof release === "string") throw Error(release);
  return release.hash;
}
