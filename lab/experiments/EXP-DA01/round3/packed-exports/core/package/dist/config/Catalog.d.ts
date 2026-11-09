import { ContentId } from "../content/ContentId.js";
import { ConfigNode, make } from "./ConfigNode.js";
import { BoolExpr } from "./BoolExpr.js";

//#region src/config/Catalog.d.ts
declare namespace Catalog_d_exports {
  export { Catalog, RULE_KIND, empty, fromNodes, lookup, ruleNode };
}
declare const RULE_KIND = "rule";
interface Catalog {
  readonly rules: ReadonlyMap<string, {
    readonly expr: BoolExpr;
    readonly cid: ContentId;
  }>;
}
declare const empty: Catalog;
/**
 * A rule as a node in the config graph.
 *
 * The refs are derived from the expression rather than declared by the caller,
 * so a rule cannot claim a dependency set that differs from the one it will
 * actually resolve. That is the same discipline `BoolExpr` uses for facts: what
 * it can reach is visible in its structure.
 */
declare const ruleNode: (key: string, expr: BoolExpr) => ReturnType<typeof make>;
/** Build a catalog from rule nodes - typically the rules in one snapshot. */
declare const fromNodes: (nodes: ReadonlyArray<ConfigNode>) => Catalog;
declare const lookup: (catalog: Catalog, key: string) => {
  readonly expr: BoolExpr;
  readonly cid: ContentId;
} | undefined;
//#endregion
export { Catalog, Catalog_d_exports, RULE_KIND, empty, fromNodes, lookup, ruleNode };
//# sourceMappingURL=Catalog.d.ts.map