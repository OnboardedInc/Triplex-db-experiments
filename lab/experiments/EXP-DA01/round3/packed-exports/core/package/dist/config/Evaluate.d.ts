import { ContentId } from "../content/ContentId.js";
import { BoolExpr } from "./BoolExpr.js";
import { Catalog } from "./Catalog.js";
import { Clock as Clock$1, Observed, World } from "./World.js";
import { Schema } from "effect";

//#region src/config/Evaluate.d.ts
declare namespace Evaluate_d_exports {
  export { Cache, Env, Evaluation, EvaluationSchema, Impact, Tampered, Truth, cached, emptyCache, env, evaluate, impact, reobserve, replay, shapeCount, verify, walk };
}
type Truth = "true" | "false" | "unknown";
/**
 * Everything an evaluation may consult: facts, the clock, and configuration.
 *
 * Bundled rather than passed separately because the whole point of the join is
 * that these are three sources of the same kind of thing - an input that is
 * observed, addressed, and can invalidate an answer.
 */
interface Env {
  readonly world: World;
  readonly clock: Clock$1;
  readonly catalog: Catalog;
  /** Who `World.SUBJECT` refers to, when a rule is about "this one". */
  readonly subject?: string;
}
declare const env: (world: World, clock: Clock$1, catalog?: Catalog, subject?: string) => Env;
interface Evaluation {
  readonly truth: Truth;
  /** Identity of this evaluation: the expression, the inputs, and the answer. */
  readonly cid: ContentId;
  readonly expr: ContentId;
  /** Everything this node and its children looked at, deduped. */
  readonly observed: ReadonlyArray<Observed>;
  readonly children: ReadonlyArray<Evaluation>;
  readonly reason?: string;
}
declare const evaluate: (expr: BoolExpr, world: World, clock: Clock$1, catalog?: Catalog, subject?: string) => Evaluation;
/**
 * Replay a recorded dependency set against the current inputs.
 *
 * Lives here rather than in `World` because a dependency may now be a config
 * node, and re-observing one means asking the catalog - the same question,
 * asked of a different source.
 */
declare const reobserve: (observed: ReadonlyArray<Observed>, env: Env) => ReadonlyArray<Observed>;
/**
 * Entries sharing one dependency *shape* - the same facts and clocks by key,
 * differing only in their values.
 *
 * Grouping this way is what keeps lookup from degrading. The obvious cache is a
 * flat list per expression, re-observing each entry until one matches; that is
 * O(entries) per lookup and quadratic over a population. Measured on an
 * expression reading a high-cardinality fact it was 0.3s at 200 subjects and
 * 17s at 1600 - each doubling quadrupling, which rules it out for an account.
 *
 * The observation is that *which* inputs an expression reads is far more stable
 * than what they contain. So re-observe once per shape, digest, and look the
 * closure up in a map. Distinct shapes are bounded by the expression's branch
 * structure, not by the number of subjects, so the common case is one
 * re-observation and one map read regardless of population.
 */
interface Shape {
  /** A representative observation set; only its keys are used to re-observe. */
  readonly probe: ReadonlyArray<Observed>;
  readonly byClosure: ReadonlyMap<ContentId, Evaluation>;
}
interface Cache {
  readonly entries: ReadonlyMap<ContentId, ReadonlyArray<Shape>>;
  readonly hits: number;
  readonly misses: number;
}
declare const emptyCache: () => Cache;
/** How many distinct dependency shapes this expression has produced. */
declare const shapeCount: (cache: Cache, expr: BoolExpr) => number;
/**
 * Evaluate, reusing a previous answer when every input that answer actually
 * looked at is unchanged.
 *
 * A hit costs one re-observation per shape plus a map read - it never traverses
 * the world, the expression, or the other cached answers.
 */
declare const cached: (cache: Cache, expr: BoolExpr, world: World, clock: Clock$1, catalog?: Catalog, subject?: string) => {
  readonly evaluation: Evaluation;
  readonly cache: Cache;
  readonly hit: boolean;
};
/** Depth-first walk of the provenance tree. */
declare function walk(evaluation: Evaluation): Generator<Evaluation>;
interface Impact {
  readonly considered: number;
  /** Provably unaffected: none of the config they read moved. Never evaluated. */
  readonly skipped: number;
  readonly reevaluated: number;
  readonly flipped: ReadonlyArray<{
    readonly subject: number;
    readonly from: Truth;
    readonly to: Truth;
  }>;
}
/**
 * "If I publish this, what changes?" - answered before publishing.
 *
 * This is what the join is for. The closure an evaluation recorded is not only
 * a cache key, it is an invalidation index: a subject whose answer read none of
 * the rules that moved *cannot* flip, so it is skipped without being evaluated.
 * Work is proportional to the blast radius of the change rather than to the
 * size of the population, which is what makes the preview affordable to run on
 * every publish rather than as an offline report.
 *
 * Note the asymmetry with facts. Config deps are resolvable up front - the two
 * catalogs are both in hand - so the skip decision is made without touching a
 * world. Fact deps could not be pruned this way, because knowing which facts an
 * answer would read requires evaluating it.
 */
declare const impact: (cache: Cache, expr: BoolExpr, subjects: ReadonlyArray<World>, clock: Clock$1, before: Catalog, after: Catalog) => {
  readonly impact: Impact;
  readonly cache: Cache;
};
/**
 * A decision, in the form it leaves the process in.
 *
 * Plain data with no values in it - the observations carry digests - so a tree
 * can be handed to an auditor, stored, or sent over a wire without becoming a
 * second copy of the facts it was made from.
 */
declare const EvaluationSchema: Schema.Codec<Evaluation>;
interface Tampered {
  readonly path: string;
  readonly claimed: ContentId;
  readonly actual: ContentId;
}
/**
 * Recompute every id in an evaluation from its own contents.
 *
 * This is the auditor's check, and it needs nothing but the tree: no database,
 * no catalog, no trust in whoever handed it over. Each node's id is derived
 * from its answer, the expression that produced it, the digest of everything it
 * observed, and its children's ids - so altering any of those, at any depth,
 * breaks the root. A decision that verifies is a decision nobody edited after
 * the fact.
 *
 * This is an internal-consistency and tamper-evidence check. It deliberately
 * does not check whether the answer follows from an authoritative deployed
 * rule or whether observed configuration ids belong to a release; that is a
 * replay/attestation check and needs trusted external inputs.
 */
declare const verify: (evaluation: Evaluation, path?: string) => ReadonlyArray<Tampered>;
/**
 * Re-derive a decision from the rule and the inputs it recorded.
 *
 * The stronger claim: not merely that the record is internally consistent, but
 * that evaluating this expression against a world matching the recorded
 * observations reproduces exactly this answer. Because the record holds digests
 * rather than values, the caller supplies the world - which is the point. An
 * auditor with the data can reproduce the decision; an auditor without it can
 * still verify the decision was not tampered with.
 */
declare const replay: (expr: BoolExpr, evaluation: Evaluation, world: World, clock: Clock$1, catalog?: Catalog, subject?: string) => boolean;
//#endregion
export { Cache, Env, Evaluate_d_exports, Evaluation, EvaluationSchema, Impact, Tampered, Truth, cached, emptyCache, env, evaluate, impact, reobserve, replay, shapeCount, verify, walk };
//# sourceMappingURL=Evaluate.d.ts.map