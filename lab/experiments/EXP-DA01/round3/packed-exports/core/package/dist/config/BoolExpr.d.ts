import { ContentId } from "../content/ContentId.js";

//#region src/config/BoolExpr.d.ts
declare namespace BoolExpr_d_exports {
  export { All, Any, Before, BoolExpr, Eq, Exists, Lit, Not, Rule, all, any, before, canonical, eq, exists, id, lit, mentions, mentionsRules, not, rule };
}
interface Lit {
  readonly _tag: "Lit";
  readonly v: 1;
  readonly value: boolean;
}
interface Exists {
  readonly _tag: "Exists";
  readonly v: 1;
  readonly entity: string;
  readonly attribute: string;
}
interface Eq {
  readonly _tag: "Eq";
  readonly v: 1;
  readonly entity: string;
  readonly attribute: string;
  readonly value: string | number | boolean;
}
/** Reads an instant-valued fact and compares it to the clock. */
interface Before {
  readonly _tag: "Before";
  readonly v: 1;
  readonly entity: string;
  readonly attribute: string;
  readonly granularity: "instant" | "day";
}
/**
 * Call another rule by key.
 *
 * The one node that reaches outside the world into the *config* graph. It is
 * still bounded - the key is right there in the structure, so what a rule can
 * reach remains statically visible and the dependency set stays honest.
 */
interface Rule {
  readonly _tag: "Rule";
  readonly v: 1;
  readonly key: string;
}
interface Not {
  readonly _tag: "Not";
  readonly v: 1;
  readonly expr: BoolExpr;
}
interface All {
  readonly _tag: "All";
  readonly v: 1;
  readonly exprs: ReadonlyArray<BoolExpr>;
}
interface Any {
  readonly _tag: "Any";
  readonly v: 1;
  readonly exprs: ReadonlyArray<BoolExpr>;
}
type BoolExpr = Lit | Exists | Eq | Before | Rule | Not | All | Any;
declare const lit: (value: boolean) => Lit;
declare const exists: (entity: string, attribute: string) => Exists;
declare const eq: (entity: string, attribute: string, value: string | number | boolean) => Eq;
declare const before: (entity: string, attribute: string, granularity?: "instant" | "day") => Before;
declare const rule: (key: string) => Rule;
declare const not: (expr: BoolExpr) => Not;
declare const all: (exprs: ReadonlyArray<BoolExpr>) => All;
declare const any: (exprs: ReadonlyArray<BoolExpr>) => Any;
declare const canonical: (expr: BoolExpr) => string;
declare const id: (expr: BoolExpr) => ContentId;
/**
 * Every fact this expression *could* read, without evaluating it.
 *
 * Available because the language is bounded. Note this is the static
 * over-approximation - `Any` short-circuits, so a run may observe fewer. The
 * cache keys on what was *actually* observed, not on this; this is for indexes
 * and impact analysis ("which predicates mention `employee.start_date`?").
 */
declare const mentions: (expr: BoolExpr) => ReadonlyArray<{
  entity: string;
  attribute: string;
}>;
/** Rules this expression calls directly. Used to derive a rule node's refs. */
declare const mentionsRules: (expr: BoolExpr) => ReadonlyArray<string>;
//#endregion
export { All, Any, Before, BoolExpr, BoolExpr_d_exports, Eq, Exists, Lit, Not, Rule, all, any, before, canonical, eq, exists, id, lit, mentions, mentionsRules, not, rule };
//# sourceMappingURL=BoolExpr.d.ts.map