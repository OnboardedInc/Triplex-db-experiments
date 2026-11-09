import { IntegerValue } from "../Value.js";
import { Clause, DatalogQuery, NotClause, OrClause, PatternClause, PredicateClause, RuleApplication } from "./schema.js";
import { SqlDialect } from "../dialects/types.js";
import { Data } from "effect";
import * as _$effect_Unify0 from "effect/Unify";

//#region src/datalog/compiler.d.ts
/**
 * Tracks where a variable is bound in the SQL query
 */
type TripleBindingPosition = "entity" | "attribute" | "value" | "tx";
type RuleBindingPosition = "arg1" | "arg2";
type VariableBinding = {
  readonly _tag: "Computed";
  readonly expression: string;
  readonly integer: boolean;
} | {
  readonly _tag: "Triple";
  readonly alias: string;
  readonly position: TripleBindingPosition;
} | {
  readonly _tag: "Rule";
  readonly alias: string;
  readonly position: RuleBindingPosition;
};
declare const tripleBinding: (alias: string, position: TripleBindingPosition) => VariableBinding;
declare const ruleBinding: (alias: string, position: RuleBindingPosition) => VariableBinding;
type InternalClause = Data.TaggedEnum<{
  Pattern: {
    readonly pattern: PatternClause;
  };
  Predicate: {
    readonly predicate: PredicateClause;
  };
  Not: {
    readonly notClause: NotClause;
  };
  Or: {
    readonly orClause: OrClause;
  };
  RuleCall: {
    readonly ruleApplication: RuleApplication;
  };
}>;
declare const InternalClause: {
  readonly Pattern: Data.TaggedEnum.ConstructorFrom<{
    readonly _tag: "Pattern";
    readonly pattern: PatternClause;
  }, "_tag">;
  readonly Predicate: Data.TaggedEnum.ConstructorFrom<{
    readonly _tag: "Predicate";
    readonly predicate: PredicateClause;
  }, "_tag">;
  readonly Not: Data.TaggedEnum.ConstructorFrom<{
    readonly _tag: "Not";
    readonly notClause: NotClause;
  }, "_tag">;
  readonly Or: Data.TaggedEnum.ConstructorFrom<{
    readonly _tag: "Or";
    readonly orClause: OrClause;
  }, "_tag">;
  readonly RuleCall: Data.TaggedEnum.ConstructorFrom<{
    readonly _tag: "RuleCall";
    readonly ruleApplication: RuleApplication;
  }, "_tag">;
  readonly $is: <Tag extends "Pattern" | "Predicate" | "Not" | "Or" | "RuleCall">(tag: Tag) => (u: unknown) => u is Extract<{
    readonly _tag: "Pattern";
    readonly pattern: PatternClause;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Predicate";
    readonly predicate: PredicateClause;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Not";
    readonly notClause: NotClause;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "Or";
    readonly orClause: OrClause;
  }, {
    readonly _tag: Tag;
  }> | Extract<{
    readonly _tag: "RuleCall";
    readonly ruleApplication: RuleApplication;
  }, {
    readonly _tag: Tag;
  }>;
  readonly $match: {
    <Cases extends {
      readonly Pattern: (args: {
        readonly _tag: "Pattern";
        readonly pattern: PatternClause;
      }) => any;
      readonly Predicate: (args: {
        readonly _tag: "Predicate";
        readonly predicate: PredicateClause;
      }) => any;
      readonly Not: (args: {
        readonly _tag: "Not";
        readonly notClause: NotClause;
      }) => any;
      readonly Or: (args: {
        readonly _tag: "Or";
        readonly orClause: OrClause;
      }) => any;
      readonly RuleCall: (args: {
        readonly _tag: "RuleCall";
        readonly ruleApplication: RuleApplication;
      }) => any;
    }>(cases: Cases): (value: {
      readonly _tag: "Pattern";
      readonly pattern: PatternClause;
    } | {
      readonly _tag: "Predicate";
      readonly predicate: PredicateClause;
    } | {
      readonly _tag: "Not";
      readonly notClause: NotClause;
    } | {
      readonly _tag: "Or";
      readonly orClause: OrClause;
    } | {
      readonly _tag: "RuleCall";
      readonly ruleApplication: RuleApplication;
    }) => _$effect_Unify0.Unify<ReturnType<Cases["Pattern" | "Predicate" | "Not" | "Or" | "RuleCall"]>>;
    <Cases extends {
      readonly Pattern: (args: {
        readonly _tag: "Pattern";
        readonly pattern: PatternClause;
      }) => any;
      readonly Predicate: (args: {
        readonly _tag: "Predicate";
        readonly predicate: PredicateClause;
      }) => any;
      readonly Not: (args: {
        readonly _tag: "Not";
        readonly notClause: NotClause;
      }) => any;
      readonly Or: (args: {
        readonly _tag: "Or";
        readonly orClause: OrClause;
      }) => any;
      readonly RuleCall: (args: {
        readonly _tag: "RuleCall";
        readonly ruleApplication: RuleApplication;
      }) => any;
    }>(value: {
      readonly _tag: "Pattern";
      readonly pattern: PatternClause;
    } | {
      readonly _tag: "Predicate";
      readonly predicate: PredicateClause;
    } | {
      readonly _tag: "Not";
      readonly notClause: NotClause;
    } | {
      readonly _tag: "Or";
      readonly orClause: OrClause;
    } | {
      readonly _tag: "RuleCall";
      readonly ruleApplication: RuleApplication;
    }, cases: Cases): _$effect_Unify0.Unify<ReturnType<Cases["Pattern" | "Predicate" | "Not" | "Or" | "RuleCall"]>>;
  };
};
interface ClassifiedClauses {
  patterns: PatternClause[];
  predicates: PredicateClause[];
  notClauses: NotClause[];
  orClauses: OrClause[];
  ruleApplications: RuleApplication[];
}
/**
 * Query compilation and execution metrics
 */
interface QueryMetrics {
  joinCount: number;
  whereConditionCount: number;
  subqueryCount: number;
  cteCount: number;
  sqlLength: number;
  paramCount: number;
  patternCount: number;
  predicateCount: number;
  notClauseCount: number;
  orClauseCount: number;
  hasAggregation: boolean;
  isRecursive: boolean;
  aggregateOps: string[];
  compilationTimeMs: number;
}
/**
 * Result of compiling a Datalog query
 */
interface CompiledQuery {
  sql: string;
  /** Parameters for the parameterized query */
  params: unknown[];
  /** Maps result column names to variable names */
  columnMap: Map<string, string>;
  /** Canonical scalar-family columns used to decode a projected triple value. */
  valueColumnMap: Map<string, CompiledValueColumns>;
  /** Result columns whose SQL representation must be decoded as a number. */
  numericColumns: Set<string>;
  /** Parameterized constant projections and their backend-independent public values. */
  constantColumns: Map<string, string | number | boolean | IntegerValue>;
  integerColumns?: Set<string>;
  /** Optional metrics - only included when debug=true */
  metrics?: QueryMetrics;
}
interface CompiledValueColumns {
  readonly orderInteger?: string;
  readonly category: string;
  readonly orderNumber: string;
  readonly orderText: string;
  readonly type: string;
  readonly string: string;
  readonly number: string;
  readonly boolean: string;
}
interface CompileOptions {
  /** Keep temporal filters on inner joins in WHERE for correlated interval evaluation. */
  readonly temporalInWhere?: boolean;
  /** Trusted adapter execution policy. Omitted keeps the legacy SQL plan.
   * Set variants preserve binary relation identity, not path witness counts. */
  readonly recursiveExecution?: "depth-set" | "keyed-set";
  /** Adapter type-domain evidence for exact signed integer expressions. */
  readonly integerVariables?: readonly string[];
  /** Complete candidate-domain absence proof at the adapter's fixed source cut.
   * Unknown variables must be omitted from this list; arithmetic evidence is separate. */
  readonly nonIntegerProjectionVariables?: readonly string[];
  /** Evaluate every triple alias against this bitemporal basis. */
  readonly basis?: {
    readonly recordedAt?: number;
    readonly recordedPosition?: number;
    readonly validAt: number;
  };
}
type BindingValueMode = "raw" | "string" | "number" | "boolean" | "coalesce";
declare const resolveBinding: (binding: VariableBinding, options?: {
  valueMode?: BindingValueMode;
}) => string;
declare const isValueLikeBinding: (binding: VariableBinding) => boolean;
declare const parseClause: (clause: Clause, options: {
  allowRuleApplications: boolean;
}) => InternalClause;
declare const classifyClauses: (where: readonly Clause[], options: {
  allowRuleApplications: boolean;
}) => ClassifiedClauses;
/**
 * Compile a Datalog query to SQL
 *
 * @param query - The Datalog query to compile
 * @param dialect - SQL dialect to use (defaults to SQLite)
 * @param includeMetrics - Whether to include compilation metrics (for debugging)
 */
declare const compile: (input: DatalogQuery, dialect?: SqlDialect, includeMetrics?: boolean, options?: CompileOptions) => CompiledQuery;
/**
 * Compile and return just the SQL string (convenience function)
 */
declare const compileToSql: (query: DatalogQuery, dialect?: SqlDialect) => string;
/**
 * Compile a Datalog query with recursive rules to SQL using CTEs
 */
declare const compileWithRules: (input: DatalogQuery, dialect?: SqlDialect, includeMetrics?: boolean, options?: CompileOptions) => CompiledQuery;
/**
 * Compile a query with rules and return just the SQL string
 */
declare const compileWithRulesToSql: (query: DatalogQuery, dialect?: SqlDialect) => string;
//#endregion
export { type BindingValueMode, type ClassifiedClauses, CompileOptions, CompiledQuery, CompiledValueColumns, QueryMetrics, type VariableBinding, classifyClauses, compile, compileToSql, compileWithRules, compileWithRulesToSql, isValueLikeBinding, parseClause, resolveBinding, ruleBinding, tripleBinding };
//# sourceMappingURL=compiler.d.ts.map