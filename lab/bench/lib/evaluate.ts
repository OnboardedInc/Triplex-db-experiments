/**
 * P5 seams (TARGETS 1.1 P5): release evaluation and outbox publication.
 *
 * A sweep must evaluate release R against the world definition W0 for every in-scope subject at one
 * shared basis and publish results as work items through the atomic outbox path, with expected outputs
 * from O-DOMAIN. EXP-D01 builds the W0 reference kernel; until it lands, `evaluate` and `publish` are
 * stubs that FAIL CLOSED: the sweep still fetches every world at the captured basis (reported as a
 * fetch-only diagnostic, checked against the model), but no P5 bar can pass.
 */
import { createHash } from "node:crypto";
import type { PulledTriple } from "./composition.ts";

export interface Release {
  readonly id: string;
  /** Content hash of the release definition (requirements, scope). */
  readonly sha256: string;
  readonly definition: unknown;
}
export interface Evaluation {
  readonly subject: number;
  readonly outputs: unknown;
}
export class SeamNotImplemented extends Error {
  readonly _tag = "SeamNotImplemented";
}

/** Stub release until W0 defines one; its hash is bound in the receipt. */
export function stubRelease(): Release {
  const definition = { id: "R-stub-v0", note: "placeholder until the W0 reference kernel (EXP-D01) defines releases", requirementsChanged: 3 };
  return { id: definition.id, sha256: createHash("sha256").update(JSON.stringify(definition)).digest("hex"), definition };
}

export const EVALUATE_SEAM = { status: "fail-closed", owner: "EXP-D01 (W0 reference kernel, O-DOMAIN)", reason: "evaluate(subjectWorld, release) is not implemented" } as const;
export const PUBLISH_SEAM = { status: "fail-closed", owner: "outbox path (TARGETS section 3 atomic outbox and work items)", reason: "publish(evaluations) through the outbox is not implemented" } as const;

export function evaluate(_subject: number, _world: readonly PulledTriple[], _release: Release): Evaluation {
  throw new SeamNotImplemented(EVALUATE_SEAM.reason);
}
export async function publish(_evaluations: readonly Evaluation[]): Promise<never> {
  throw new SeamNotImplemented(PUBLISH_SEAM.reason);
}

/** Exact coverage: hash of the ordered in-scope subject list. */
export function coverageHash(subjects: readonly number[]): string {
  return createHash("sha256").update(subjects.join(",")).digest("hex");
}
