import {
  gateRecordedAt,
  instantOf,
  stampOf,
  BasisNotAvailable,
  MigrationError,
  type RecordCut,
  type ResolvedTemporalBasis,
} from "@triplex-build/triplex";
import type { QleverClient } from "./QleverClient.js";
import { graphIri, metaIri, fieldIri as f } from "./rdf.js";

export const readQleverCut = async (
  client: QleverClient,
  scope: string,
  signal?: AbortSignal,
): Promise<RecordCut> => {
  const rows = await client.query(
    `SELECT ?position ?stamp WHERE { GRAPH ${graphIri(scope)} { ${metaIri} ${f("position")} ?position . OPTIONAL { ${metaIri} ${f("stamp")} ?stamp } } }`,
    { ...(signal ? { signal } : {}) },
  );
  const position = Number(rows[0]?.["position"]?.value ?? 0);
  if (!Number.isSafeInteger(position) || position < 0)
    throw new TypeError("Unsafe source position");
  if (position && !rows[0]?.["stamp"])
    throw new MigrationError({
      version: 2,
      name: "record-stamp",
      message: "Scope predates decided record stamps; re-seed",
    });
  return {
    position,
    recordedAt: instantOf(
      rows[0]?.["stamp"] ? Number(BigInt(`0x${rows[0]["stamp"].value}`) - (1n << 63n)) : 0,
    ),
  };
};
export const resolveQleverBasis = async (
  client: QleverClient,
  scope: string,
  basis: ResolvedTemporalBasis,
  signal?: AbortSignal,
  waitMs = 2000,
): Promise<ResolvedTemporalBasis & { recordedPosition: number }> => {
  const readCut = () => readQleverCut(client, scope, signal);
  const start = performance.now();
  let cut = await readCut();
  const wait = async (test: (cut: RecordCut) => boolean, ms: number) => {
    const until = performance.now() + ms;
    while (!test(cut) && performance.now() < until) {
      signal?.throwIfAborted();
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(10, Math.max(0, until - performance.now()))),
      );
      cut = await readCut();
    }
    return cut;
  };
  if (basis.recordedPosition !== undefined && basis.recordedPosition > cut.position) {
    await wait((value) => value.position >= basis.recordedPosition!, waitMs);
    if (basis.recordedPosition > cut.position)
      throw new BasisNotAvailable({
        axis: "recordedPosition",
        required: basis.recordedPosition,
        observed: cut.position,
        waitedMs: performance.now() - start,
        surface: "qlever",
        message: "Position not reached",
      });
  }
  if (basis.recordedAt !== undefined)
    cut = await gateRecordedAt({
      recordedAt: basis.recordedAt,
      readCut: async () => cut,
      awaitCut: (stamp, ms) => wait((value) => stampOf(value.recordedAt) >= stamp, ms),
      deadlineMs: Math.max(0, waitMs - (performance.now() - start)),
      surface: "qlever",
    });
  return { ...basis, recordedPosition: basis.recordedPosition ?? cut.position };
};
