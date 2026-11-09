import { ContentId } from "../content/ContentId.js";

//#region src/config/World.d.ts
declare namespace World_d_exports {
  export { Clock, Granularity, Observed, SUBJECT, Value, World, bucket, closureId, factKey, make, matches, observe, observedKey, read, valueDigest, withFact, withoutFact };
}
type Value = string | number | boolean;
/** Facts, keyed by entity and attribute. One value per pair. */
interface World {
  readonly facts: ReadonlyMap<string, Value>;
}
type Granularity = "instant" | "day";
interface Clock {
  readonly now: number;
  /**
   * How finely an expression may observe the clock. `day` buckets to the UTC
   * day, so a cached answer survives until the day turns.
   */
  readonly granularity: Granularity;
}
declare const bucket: (clock: Clock) => number;
/**
 * The entity a rule means when it says "this one".
 *
 * A compliance rule is about *an* employee, not about `ee_1`. Baking a
 * particular id into the expression would mint a separate rule per person -
 * a thousand config objects saying the same thing, each versioned and diffed
 * on its own, and no way to ask "did the I-9 rule change".
 *
 * So reads may name this sentinel and evaluation substitutes the subject.
 * Crucially the substitution happens at evaluation, not at construction: the
 * rule's content id stays subject-free, so it is ONE object in the graph, while
 * each decision's id differs because its observations name the real entity.
 * One rule, many proofs.
 */
declare const SUBJECT = "$subject";
declare const factKey: (entity: string, attribute: string) => string;
declare const make: (facts: Readonly<Record<string, Value>>) => World;
declare const withFact: (world: World, entity: string, attribute: string, value: Value) => World;
declare const withoutFact: (world: World, entity: string, attribute: string) => World;
declare const read: (world: World, entity: string, attribute: string) => Value | undefined;
/**
 * One thing an evaluation looked at. The union is the point: a clock reading is
 * a dependency in exactly the same sense as a fact, and a *missing* fact is a
 * dependency in exactly the same sense as a present one.
 */
type Observed = {
  /**
   * A config node this evaluation resolved, addressed by content. `cid` is
   * null when the catalog had no such node - absence is a dependency here
   * for the same reason it is for facts, so publishing a missing rule
   * invalidates the answers that noticed it was missing.
   */
  readonly _tag: "Config";
  readonly kind: string;
  readonly key: string;
  readonly cid: ContentId | null;
} | {
  readonly _tag: "Fact";
  readonly entity: string;
  readonly attribute: string;
  readonly present: boolean; /** Digest of the value, not the value. See the note above. */
  readonly digest?: ContentId;
} | {
  readonly _tag: "Clock";
  readonly granularity: Granularity;
  readonly bucket: number;
};
/** Identity of an observation, used to dedupe and to order the closure. */
declare const observedKey: (o: Observed) => string;
/**
 * The digest of everything an evaluation depended on.
 *
 * This is the cache key's other half. Observations are deduped by key and
 * sorted, so the order an expression happened to read things in is not content.
 */
declare const closureId: (observed: ReadonlyArray<Observed>) => ContentId;
/**
 * The digest of a fact's value.
 *
 * Domain-separated from node and type ids so a value's digest can never be
 * mistaken for, or forged from, an id in another space.
 */
declare const valueDigest: (value: Value) => ContentId;
/** Observe a fact without retaining its value. */
declare const observe: (world: World, entity: string, attribute: string) => Observed;
/**
 * Does a candidate value match what an observation recorded?
 *
 * The verification direction. Someone holding a decision and a proposed value
 * can confirm the decision was made from that value; nobody holding only the
 * decision can recover it.
 */
declare const matches: (observed: Observed, value: Value) => boolean;
//#endregion
export { Clock, Granularity, Observed, SUBJECT, Value, World, World_d_exports, bucket, closureId, factKey, make, matches, observe, observedKey, read, valueDigest, withFact, withoutFact };
//# sourceMappingURL=World.d.ts.map