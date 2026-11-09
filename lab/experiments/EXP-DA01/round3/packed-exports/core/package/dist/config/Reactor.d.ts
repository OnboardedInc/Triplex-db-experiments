import { BoolExpr } from "./BoolExpr.js";
import { Granularity } from "./World.js";
import { Env, Evaluation, Truth } from "./Evaluate.js";

//#region src/config/Reactor.d.ts
declare namespace Reactor_d_exports {
  export { Flip, Reactor, Registration, affected, answer, clockKey, empty, factKey, react, refresh, register, registerAll, ruleKey, unregister };
}
interface Registration {
  readonly key: string;
  readonly expr: BoolExpr;
  readonly evaluation: Evaluation;
}
interface Reactor {
  readonly registrations: ReadonlyMap<string, Registration>;
  /** Observation key to the registrations whose answers depended on it. */
  readonly index: ReadonlyMap<string, ReadonlySet<string>>;
}
declare const empty: Reactor;
declare const factKey: (entity: string, attribute: string) => string;
declare const ruleKey: (key: string) => string;
declare const clockKey: (granularity: Granularity) => string;
/** Record a standing interest, evaluating it once. */
declare const register: (reactor: Reactor, key: string, expr: BoolExpr, env: Env) => Reactor;
/**
 * Register many at once.
 *
 * Not sugar: `register` in a loop copies the whole reactor per entry, which is
 * quadratic. Anything bulk - loading an account, backfilling after a publish -
 * has to come through here.
 */
declare const registerAll: (reactor: Reactor, entries: ReadonlyArray<{
  readonly key: string;
  readonly expr: BoolExpr;
  readonly env: Env;
}>) => Reactor;
declare const unregister: (reactor: Reactor, key: string) => Reactor;
declare const answer: (reactor: Reactor, key: string) => Evaluation | undefined;
/**
 * Which registrations depended on any of these inputs?
 *
 * A lookup per changed input, not a scan. This is the whole reason the index
 * exists: the work of reacting is proportional to what the change touched, not
 * to how much the product is watching.
 */
declare const affected: (reactor: Reactor, changed: ReadonlyArray<string>) => ReadonlyArray<string>;
interface Flip {
  readonly key: string;
  readonly from: Truth;
  readonly to: Truth;
}
/**
 * Recompute the given registrations and report which answers actually moved.
 *
 * Recomputation and change are different events: a rule edit may invalidate a
 * thousand decisions and flip none of them. Callers that notify people care
 * about the flips; callers that keep a read model current care about both.
 */
declare const refresh: (reactor: Reactor, keys: ReadonlyArray<string>, env: Env) => {
  readonly reactor: Reactor;
  readonly flipped: ReadonlyArray<Flip>;
};
/** `affected` then `refresh`: the ordinary path when something changes. */
declare const react: (reactor: Reactor, changed: ReadonlyArray<string>, env: Env) => {
  readonly reactor: Reactor;
  readonly considered: ReadonlyArray<string>;
  readonly flipped: ReadonlyArray<Flip>;
};
//#endregion
export { Flip, Reactor, Reactor_d_exports, Registration, affected, answer, clockKey, empty, factKey, react, refresh, register, registerAll, ruleKey, unregister };
//# sourceMappingURL=Reactor.d.ts.map