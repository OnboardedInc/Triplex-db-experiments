import { EntityId } from "../Branded.js";
import { TripleValue } from "../Value.js";
import { Schema } from "effect";

//#region src/types/Pattern.d.ts
declare const Variable: Schema.Struct<{
  readonly _tag: Schema.Literal<"Variable">;
  readonly name: Schema.String;
}>;
type Variable = typeof Variable.Type;
declare const variable: (name: string) => Variable;
declare const v: (name: string) => Variable;
declare const isVariable: (x: unknown) => x is Variable;
interface Pattern {
  readonly entityId?: EntityId | Variable;
  readonly attribute?: string | Variable;
  readonly value?: TripleValue | Variable;
  readonly entityType?: string;
}
interface Binding {
  readonly [variable: string]: unknown;
}
//#endregion
export { Binding, Pattern, Variable, isVariable, v, variable };
//# sourceMappingURL=Pattern.d.ts.map