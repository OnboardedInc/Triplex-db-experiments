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
  const definition = {
    id: "R-stub-v0",
    note: "placeholder until the W0 reference kernel (EXP-D01) defines releases",
    requirementsChanged: 3,
  };
  return {
    id: definition.id,
    sha256: createHash("sha256").update(JSON.stringify(definition)).digest("hex"),
    definition,
  };
}

export const EVALUATE_SEAM = {
  status: "fail-closed",
  owner: "EXP-D01 (W0 reference kernel, O-DOMAIN)",
  reason: "evaluate(subjectWorld, release) is not implemented",
} as const;
export const PUBLISH_SEAM = {
  status: "fail-closed",
  owner: "outbox path (TARGETS section 3 atomic outbox and work items)",
  reason: "publish(evaluations) through the outbox is not implemented",
} as const;

export function evaluate(
  _subject: number,
  _world: readonly PulledTriple[],
  _release: Release,
): Evaluation {
  throw new SeamNotImplemented(EVALUATE_SEAM.reason);
}
export async function publish(_evaluations: readonly Evaluation[]): Promise<never> {
  throw new SeamNotImplemented(PUBLISH_SEAM.reason);
}

/** Exact coverage: hash of the ordered in-scope subject list. */
export function coverageHash(subjects: readonly number[]): string {
  return createHash("sha256").update(subjects.join(",")).digest("hex");
}

/** W0 entry points for the position-based sweep; legacy fetch-only calls above remain closed. */
export interface W0Pins {
  readonly contractSha256: string;
  readonly w0Version: string;
  readonly domainVersion: string;
}
export async function loadW0Pins(): Promise<W0Pins> {
  const fs = await import("node:fs");
  const contractBytes = fs.readFileSync(
    new URL("../../acceptance/obligations.json", import.meta.url),
  );
  const contract = JSON.parse(contractBytes.toString());
  const w0 = contract.w0Pin,
    domain = contract.oraclePins?.["O-DOMAIN"];
  if (
    !w0?.files ||
    !w0.reviewReceipt ||
    !w0.oDomainFingerprint ||
    !domain?.sha256 ||
    !domain.acceptReceipt
  )
    throw new SeamNotImplemented("missing accepted W0 or O-DOMAIN pin");
  const root = new URL("../../../", import.meta.url);
  for (const [file, hash] of Object.entries({ ...w0.files, ...domain.sha256 })) {
    const bytes = fs.readFileSync(new URL(file, root));
    if (createHash("sha256").update(bytes).digest("hex") !== hash)
      throw new SeamNotImplemented("pin mismatch: " + file);
  }
  return {
    contractSha256: createHash("sha256").update(contractBytes).digest("hex"),
    w0Version: w0.version,
    domainVersion: domain.oracleVersion ?? domain.commit,
  };
}
export async function evaluateW0(
  world: import("../../../packages/w0/dist/index.js").World,
  release: string,
  basis: import("./w0-world.ts").PositionBasis,
  pins: W0Pins | null,
  activations?: readonly import("../../../packages/w0/dist/index.js").Activation[],
) {
  if (!pins?.contractSha256 || !pins.w0Version || !pins.domainVersion)
    throw new SeamNotImplemented("missing W0 or O-DOMAIN pin");
  const { W0, w0Basis } = await import("./w0-world.ts");
  const B = w0Basis(basis);
  if (activations) {
    const r = W0.reconcileWorld(world, activations, B);
    if ("error" in r) throw new Error(r.error);
    return { output: r, json: W0.outputJson(r), record: W0.recordOf(r) };
  }
  const R = W0.RELEASES_BY_NAME.get(release);
  if (!R) throw new SeamNotImplemented("unknown W0 release");
  const r = W0.sweepSubject(world, R, B);
  if ("error" in r) throw new Error(r.error);
  return r;
}
export async function publishW0(
  comp: import("./composition.ts").CompositionHandle,
  records: readonly import("../../../packages/w0/dist/index.js").EvaluationRecord[],
  pins: W0Pins | null,
) {
  if (!pins?.contractSha256 || !pins.w0Version || !pins.domainVersion)
    throw new SeamNotImplemented("missing W0 or O-DOMAIN pin");
  return comp.publishOutbox(records);
}

// [EXP-P5-R3] Why: semantic traffic/reference answers require the accepted independent replay bytes. Rejected: calling an unbound Python implementation and treating its exit code as correctness.
export async function loadReplayPin() {
  const fs = await import("node:fs");
  const c = JSON.parse(
    fs.readFileSync(new URL("../../acceptance/obligations.json", import.meta.url), "utf8"),
  );
  const pin = c.oraclePins?.["O-REPLAY"];
  if (!pin?.sha256 || !pin.acceptReceipt)
    throw new SeamNotImplemented("missing accepted O-REPLAY pin");
  for (const [file, want] of Object.entries(pin.sha256))
    if (
      createHash("sha256")
        .update(fs.readFileSync(new URL(file, new URL("../../../", import.meta.url))))
        .digest("hex") !== want
    )
      throw new SeamNotImplemented("O-REPLAY pin mismatch: " + file);
  return { version: pin.oracleVersion, commit: pin.commit, sha256: pin.sha256 };
}
