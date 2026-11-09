import { TypeExpr } from "./TypeExpr.js";
import { Data } from "effect";
import * as _$effect_Unify0 from "effect/Unify";

//#region src/config/TypeSubsumption.d.ts
declare namespace TypeSubsumption_d_exports {
  export { Verdict, isCompatible, subsumes };
}
type Verdict = Data.TaggedEnum<{
  Identical: {}; /** Proven: every value of `from` is accepted by `to`. */
  Widens: {
    readonly reasons: ReadonlyArray<string>;
  }; /** Not proven compatible. See the note on `Pattern` above. */
  Narrows: {
    readonly reasons: ReadonlyArray<string>;
  };
}>;
declare const Verdict: {
  readonly Identical: Data.TaggedEnum.ConstructorFrom<{
    readonly _tag: "Identical";
  }, "_tag">;
  readonly Widens: Data.TaggedEnum.ConstructorFrom<{
    readonly _tag: "Widens";
    readonly reasons: ReadonlyArray<string>;
  }, "_tag">;
  readonly Narrows: Data.TaggedEnum.ConstructorFrom<{
    readonly _tag: "Narrows";
    readonly reasons: ReadonlyArray<string>;
  }, "_tag">;
  readonly $is: <Tag extends "Identical" | "Widens" | "Narrows">(tag: Tag) => (u: unknown) => u is Extract<{
    readonly _tag: "Identical";
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Widens";
    readonly reasons: ReadonlyArray<string>;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Narrows";
    readonly reasons: ReadonlyArray<string>;
  }, {
    readonly _tag: Tag;
  }>;
  readonly $match: {
    <Cases extends {
      readonly Identical: (args: {
        readonly _tag: "Identical";
      }) => any;
      readonly Widens: (args: {
        readonly _tag: "Widens";
        readonly reasons: ReadonlyArray<string>;
      }) => any;
      readonly Narrows: (args: {
        readonly _tag: "Narrows";
        readonly reasons: ReadonlyArray<string>;
      }) => any;
    }>(cases: Cases): (value: {
      readonly _tag: "Identical";
    } | {
      readonly _tag: "Widens";
      readonly reasons: ReadonlyArray<string>;
    } | {
      readonly _tag: "Narrows";
      readonly reasons: ReadonlyArray<string>;
    }) => _$effect_Unify0.Unify<ReturnType<Cases["Identical" | "Widens" | "Narrows"]>>;
    <Cases extends {
      readonly Identical: (args: {
        readonly _tag: "Identical";
      }) => any;
      readonly Widens: (args: {
        readonly _tag: "Widens";
        readonly reasons: ReadonlyArray<string>;
      }) => any;
      readonly Narrows: (args: {
        readonly _tag: "Narrows";
        readonly reasons: ReadonlyArray<string>;
      }) => any;
    }>(value: {
      readonly _tag: "Identical";
    } | {
      readonly _tag: "Widens";
      readonly reasons: ReadonlyArray<string>;
    } | {
      readonly _tag: "Narrows";
      readonly reasons: ReadonlyArray<string>;
    }, cases: Cases): _$effect_Unify0.Unify<ReturnType<Cases["Identical" | "Widens" | "Narrows"]>>;
  };
};
/** True when the verdict is a proof that existing values stay valid. */
declare const isCompatible: (verdict: Verdict) => boolean;
/**
 * Total. Every pair of `TypeExpr` values yields `Identical`, `Widens` or
 * `Narrows` - there is no third state and no fallback to inspecting data.
 */
declare const subsumes: (from: TypeExpr, to: TypeExpr) => Verdict;
//#endregion
export { TypeSubsumption_d_exports, Verdict, isCompatible, subsumes };
//# sourceMappingURL=TypeSubsumption.d.ts.map