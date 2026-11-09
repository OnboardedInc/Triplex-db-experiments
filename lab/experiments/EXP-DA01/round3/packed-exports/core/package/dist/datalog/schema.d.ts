import { Schema } from "effect";

//#region src/datalog/schema.d.ts
/**
 * Variable: a string starting with "?" followed by an identifier
 * Examples: "?person", "?age", "?movieTitle"
 */
declare const Variable: Schema.String;
/**
 * DatalogAttribute: a string starting with ":" followed by an identifier
 * Examples: ":name", ":age", ":movie/title"
 *
 * Note: Named DatalogAttribute to avoid conflict with shared/Branded.ts Attribute type.
 */
declare const DatalogAttribute: Schema.String;
/**
 * TypedConstant: a constant with an explicit type (e.g. ref values)
 * Matches the internal TripleValue representation { type, value }
 */
declare const TypedConstant: Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>;
type TypedConstant = typeof TypedConstant.Type;
/**
 * Check if a value is a typed constant (object with type field)
 */
declare const isTypedConstant: (value: unknown) => value is TypedConstant;
declare const Constant: Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>;
/**
 * Term: either a variable or a constant
 */
declare const Term: Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>;
/**
 * Predicate operators. Equality compares compatible flattened scalar families;
 * ordered comparisons are numeric-only and accept number/datetime value bindings.
 */
declare const PredicateOp: Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>;
/**
 * Pattern clause: [entity, attribute, value] or [entity, attribute, value, tx]
 * Used for matching triples in the database
 * The optional 4th element binds to the transaction that created the triple.
 *
 * Examples:
 * - ["?person", ":name", "Alice"]           // 3-tuple
 * - ["?movie", ":director", "?director"]    // 3-tuple
 * - ["?e", ":name", "?n", "?tx"]            // 4-tuple with tx binding
 */
declare const PatternClause3: Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>;
declare const PatternClause4: Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>;
declare const PatternClause: Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>;
/**
 * Predicate clause: [operator, left, right]
 * Used for filtering based on comparisons
 *
 * Examples:
 * - [">=", "?age", 18]
 * - ["!=", "?status", "inactive"]
 */
declare const PredicateClause: Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>;
/**
 * Not clause: ["not", clause1] or ["not", clause1, clause2, ...]
 * Used for negation - excludes results that match the clause(s).
 *
 * Single pattern: ["not", ["?person", ":banned", true]]
 *   — excludes results where the pattern matches.
 *
 * Conjunctive negation: ["not", ["?task", ":task/employee", "?emp"], ["?task", ":task/type", "I-9"]]
 *   — excludes results where ALL clauses match simultaneously (like NOT EXISTS with a JOIN).
 *   — inner clauses can be patterns or predicates.
 */
declare const NotClause: Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>]>;
/**
 * Alternative within an `or` — patterns, predicates, and negation only.
 * `or` alternatives are filter/existence checks and do not bind variables outward.
 */
declare const OrAlternative: Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>;
/**
 * Or clause: ["or", [alternative1, alternative2, ...]]
 * Used for disjunction - matches if any alternative matches.
 *
 * Examples:
 * - ["or", [["?person", ":name", "Alice"], ["?person", ":name", "Bob"]]]
 * - ["or", [["=", "?status", "offline"], ["not", ["?step", ":output", "?out"]]]]
 */
declare const OrClause: Schema.Tuple<readonly [Schema.Literal<"or">, Schema.$Array<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>]>;
/**
 * Rule application clause: [ruleName, arg1, arg2]
 * Used to apply a recursive rule in the where clause
 *
 * The rule name must not start with ? or : to distinguish from patterns
 *
 * Examples:
 * - ["ancestor", "alice", "?ancestor"]
 * - ["connected", "?a", "?b"]
 */
declare const RuleApplication: Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>]>;
/**
 * Clause: pattern, predicate, not, or, or rule application.
 *
 * We distinguish by checking the first element:
 * - If it's an operator (>, >=, <, <=, =, !=), it's a predicate
 * - If it's "not", it's a negation
 * - If it's "or", it's a disjunction
 * - If it's a plain identifier (no ? or :), it's a rule application
 * - Otherwise, it's a pattern
 */
declare const Clause: Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>]>, Schema.Tuple<readonly [Schema.Literal<"or">, Schema.$Array<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>>]>, Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>]>;
/**
 * Rule body clause: can be a pattern or a rule application
 */
declare const RuleBodyClause: Schema.Union<readonly [Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>]>, Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>]>]>;
/**
 * Rule definition for recursive queries
 *
 * A rule defines a derived relationship. Multiple rules with the same name
 * are combined with UNION (like OR).
 *
 * Example - Ancestor rule (two definitions):
 * ```typescript
 * // Base case: direct parent
 * { name: "ancestor", body: [["?x", ":parent", "?y"]] }
 *
 * // Recursive case: parent of ancestor
 * { name: "ancestor", body: [["?x", ":parent", "?z"], ["ancestor", "?z", "?y"]] }
 * ```
 */
declare const Rule: Schema.Struct<{
  /** Name of the rule (used in rule applications) */readonly name: Schema.String; /** Body clauses that define when this rule matches */
  readonly body: Schema.$Array<Schema.Union<readonly [Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>, Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>]>]>>; /** Maximum recursion depth (defaults to 100) */
  readonly maxDepth: Schema.optional<Schema.Int>;
}>;
/**
 * Aggregate operator
 */
declare const AggregateOp: Schema.Literals<readonly ["count", "sum", "avg", "min", "max"]>;
/**
 * Aggregate specification: [operator, sourceVariable, targetVariable]
 *
 * Examples:
 * - ["count", "?person", "?count"]
 */
declare const AggregateSpec: Schema.Tuple<readonly [Schema.Literals<readonly ["count", "sum", "avg", "min", "max"]>, Schema.String, Schema.String]>;
/**
 * Order direction for sorting results
 */
declare const OrderDirection: Schema.Literals<readonly ["asc", "desc"]>;
/**
 * Order by specification: { variable, direction? }
 * Used for sorting query results
 *
 * Examples:
 * - { variable: "?name" } - sort by name ascending (default)
 * - { variable: "?age", direction: "desc" } - sort by age descending
 */
declare const OrderBySpec: Schema.Struct<{
  readonly variable: Schema.String;
  readonly direction: Schema.optional<Schema.Literals<readonly ["asc", "desc"]>>;
}>;
/**
 * Having clause: [operator, left, right]
 * Used for filtering aggregated results (like SQL HAVING)
 *
 * Examples:
 * - [">=", "?count", 5] - only include groups where count >= 5
 */
declare const HavingClause: Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>]>;
/** Computed numeric binding: [operation, left, right, target]. */
declare const ComputeOp: Schema.Literals<readonly ["+", "-", "*", "/", "%"]>;
declare const ComputeSpec: Schema.Tuple<readonly [Schema.Literals<readonly ["+", "-", "*", "/", "%"]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
  readonly type: Schema.Literal<"ref">;
  readonly value: Schema.String;
}>, Schema.Struct<{
  readonly type: Schema.Literal<"integer">;
  readonly value: Schema.String;
}>]>]>]>, Schema.String]>;
/**
 * DatalogQuery: the main query structure
 *
 * - find: array of terms to return (variables will be resolved)
 * - where: array of clauses to match/filter
 * - aggregate: optional array of aggregation specs
 *
 * Example:
 * ```typescript
 * {
 *   find: ["?name", "?age"],
 *   where: [
 *     ["?person", ":name", "?name"],
 *     ["?person", ":age", "?age"],
 *     [">=", "?age", 18]
 *   ]
 * }
 * ```
 *
 * With aggregation:
 * ```typescript
 * {
 *   find: ["?dept", "?count"],
 *   where: [
 *     ["?person", ":department", "?dept"]
 *   ],
 *   aggregate: [
 *     ["count", "?person", "?count"]
 *   ]
 * }
 * ```
 */
declare const DatalogQuery: Schema.Struct<{
  readonly find: Schema.$Array<Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>>;
  readonly where: Schema.$Array<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>]>, Schema.Tuple<readonly [Schema.Literal<"or">, Schema.$Array<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>]>, Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>]>]>>;
  readonly compute: Schema.optional<Schema.$Array<Schema.Tuple<readonly [Schema.Literals<readonly ["+", "-", "*", "/", "%"]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.String]>>>;
  readonly aggregate: Schema.optional<Schema.$Array<Schema.Tuple<readonly [Schema.Literals<readonly ["count", "sum", "avg", "min", "max"]>, Schema.String, Schema.String]>>>;
  readonly having: Schema.optional<Schema.$Array<Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>]>]>>>;
  readonly orderBy: Schema.optional<Schema.$Array<Schema.Struct<{
    readonly variable: Schema.String;
    readonly direction: Schema.optional<Schema.Literals<readonly ["asc", "desc"]>>;
  }>>>;
  readonly limit: Schema.optional<Schema.Number>;
  readonly offset: Schema.optional<Schema.Number>;
  /**
   * Recursive rule definitions applied by rule-application clauses in `where`.
   * SQL backends compile these to recursive CTEs; KV backends evaluate them
   * with fixpoint evaluation.
   */
  readonly rules: Schema.optional<Schema.$Array<Schema.Struct<{
    /** Name of the rule (used in rule applications) */readonly name: Schema.String; /** Body clauses that define when this rule matches */
    readonly body: Schema.$Array<Schema.Union<readonly [Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>, Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>]>]>>; /** Maximum recursion depth (defaults to 100) */
    readonly maxDepth: Schema.optional<Schema.Int>;
  }>>>;
  readonly optionalProjection: Schema.optional<Schema.Struct<{
    readonly rowBinding: Schema.String;
    readonly fields: Schema.$Array<Schema.Struct<{
      readonly attribute: Schema.String;
      readonly variable: Schema.String;
    }>>;
  }>>;
}>;
/**
 * Filter operators for wrapper filtering
 * Supports text matching (LIKE), equality, and comparison
 */
declare const WrapperFilterOp: Schema.Literals<readonly ["=", "!=", ">", ">=", "<", "<=", "like", "not-like", "ilike", "not-ilike", "is-null", "is-not-null"]>;
/**
 * A filter condition applied to wrapper query results
 *
 * Examples:
 * - { column: "?name", op: "like", value: "%Smith%" }
 * - { column: "?age", op: ">=", value: 18 }
 * - { column: "?status", op: "is-null" }
 */
declare const WrapperFilter: Schema.Struct<{
  /** Column to filter (variable name from inner query's find clause) */readonly column: Schema.String; /** Filter operator */
  readonly op: Schema.Literals<readonly ["=", "!=", ">", ">=", "<", "<=", "like", "not-like", "ilike", "not-ilike", "is-null", "is-not-null"]>; /** Filter value (not required for is-null/is-not-null) */
  readonly value: Schema.optional<Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>]>]>>;
}>;
/**
 * Wrapped query specification for subquery semantics
 *
 * Execution order:
 * 1. Inner query runs with its own limit/offset
 * 2. Wrapper filters are applied to inner results
 * 3. Wrapper orderBy/limit/cursor paginate the filtered results
 * 4. If includeCount=true, total filtered count is also returned
 *
 * Example with cursor pagination:
 * ```typescript
 * {
 *   inner: {
 *     find: ["?name", "?age"],
 *     where: [["?p", ":name", "?name"], ["?p", ":age", "?age"]],
 *     limit: 1000
 *   },
 *   orderBy: [{ variable: "?name", direction: "asc" }],
 *   filters: [{ column: "?name", op: "ilike", value: "%smith%" }],
 *   limit: 20,
 *   cursor: firstPage.nextCursor, // Opaque cursor returned by queryPage
 *   includeCount: true
 * }
 * ```
 */
declare const WrappedQuery: Schema.Struct<{
  /** The inner Datalog query (may have its own limit/offset) */readonly inner: Schema.Struct<{
    readonly find: Schema.$Array<Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>>;
    readonly where: Schema.$Array<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>]>, Schema.Tuple<readonly [Schema.Literal<"or">, Schema.$Array<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Tuple<readonly [Schema.Literal<"not">, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>, Schema.optional<Schema.Union<readonly [Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>]>, Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>]>]>>;
    readonly compute: Schema.optional<Schema.$Array<Schema.Tuple<readonly [Schema.Literals<readonly ["+", "-", "*", "/", "%"]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.String]>>>;
    readonly aggregate: Schema.optional<Schema.$Array<Schema.Tuple<readonly [Schema.Literals<readonly ["count", "sum", "avg", "min", "max"]>, Schema.String, Schema.String]>>>;
    readonly having: Schema.optional<Schema.$Array<Schema.Tuple<readonly [Schema.Literals<readonly [">", ">=", "<", "<=", "=", "!="]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>]>]>>>;
    readonly orderBy: Schema.optional<Schema.$Array<Schema.Struct<{
      readonly variable: Schema.String;
      readonly direction: Schema.optional<Schema.Literals<readonly ["asc", "desc"]>>;
    }>>>;
    readonly limit: Schema.optional<Schema.Number>;
    readonly offset: Schema.optional<Schema.Number>;
    /**
     * Recursive rule definitions applied by rule-application clauses in `where`.
     * SQL backends compile these to recursive CTEs; KV backends evaluate them
     * with fixpoint evaluation.
     */
    readonly rules: Schema.optional<Schema.$Array<Schema.Struct<{
      /** Name of the rule (used in rule applications) */readonly name: Schema.String; /** Body clauses that define when this rule matches */
      readonly body: Schema.$Array<Schema.Union<readonly [Schema.Union<readonly [Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
        readonly type: Schema.Literal<"ref">;
        readonly value: Schema.String;
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"integer">;
        readonly value: Schema.String;
      }>]>]>]>, Schema.Union<readonly [Schema.String, Schema.String]>]>, Schema.Tuple<readonly [Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
        readonly type: Schema.Literal<"ref">;
        readonly value: Schema.String;
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"integer">;
        readonly value: Schema.String;
      }>]>]>]>]>]>, Schema.Tuple<readonly [Schema.String, Schema.Union<readonly [Schema.String, Schema.String]>, Schema.Union<readonly [Schema.String, Schema.String]>]>]>>; /** Maximum recursion depth (defaults to 100) */
      readonly maxDepth: Schema.optional<Schema.Int>;
    }>>>;
    readonly optionalProjection: Schema.optional<Schema.Struct<{
      readonly rowBinding: Schema.String;
      readonly fields: Schema.$Array<Schema.Struct<{
        readonly attribute: Schema.String;
        readonly variable: Schema.String;
      }>>;
    }>>;
  }>; /** Additional filters on the inner query's result columns */
  readonly filters: Schema.optional<Schema.$Array<Schema.Struct<{
    /** Column to filter (variable name from inner query's find clause) */readonly column: Schema.String; /** Filter operator */
    readonly op: Schema.Literals<readonly ["=", "!=", ">", ">=", "<", "<=", "like", "not-like", "ilike", "not-ilike", "is-null", "is-not-null"]>; /** Filter value (not required for is-null/is-not-null) */
    readonly value: Schema.optional<Schema.Union<readonly [Schema.String, Schema.Number, Schema.Boolean, Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>]>]>>;
  }>>>; /** Optional wrapper order; the service completes it with projected-row tie-breakers */
  readonly orderBy: Schema.optional<Schema.$Array<Schema.Struct<{
    readonly variable: Schema.String;
    readonly direction: Schema.optional<Schema.Literals<readonly ["asc", "desc"]>>;
  }>>>; /** Public page size: defaults to 100; maximum 1,000 (the executor receives one lookahead row) */
  readonly limit: Schema.optional<Schema.Number>; /** Opaque, versioned keyset cursor returned by `Triples.queryPage` */
  readonly cursor: Schema.optional<Schema.String>; /** Opt into an additional complete count of filtered results; defaults to false */
  readonly includeCount: Schema.optional<Schema.Boolean>;
}>;
/**
 * Response from a wrapped query execution
 */
declare const WrappedQueryResponse: Schema.Struct<{
  /** Query results as array of records */readonly results: Schema.$Array<Schema.$Record<Schema.String, Schema.Unknown>>; /** Total count of filtered results (if includeCount was true) */
  readonly totalCount: Schema.optional<Schema.Number>; /** Cursor for the next page (if more results available) */
  readonly nextCursor: Schema.optional<Schema.String>; /** Authorization decision identifier for auditing and trace correlation */
  readonly decisionId: Schema.optional<Schema.String>;
}>;
type Variable = typeof Variable.Type;
type DatalogAttribute = typeof DatalogAttribute.Type;
type Constant = typeof Constant.Type;
type Term = typeof Term.Type;
type PredicateOp = typeof PredicateOp.Type;
type PatternClause3 = typeof PatternClause3.Type;
type PatternClause4 = typeof PatternClause4.Type;
type PatternClause = typeof PatternClause.Type;
type PredicateClause = typeof PredicateClause.Type;
type NotClause = typeof NotClause.Type;
type OrAlternative = typeof OrAlternative.Type;
type OrClause = typeof OrClause.Type;
type RuleApplication = typeof RuleApplication.Type;
type RuleBodyClause = typeof RuleBodyClause.Type;
type Rule = typeof Rule.Type;
type Clause = typeof Clause.Type;
type AggregateOp = typeof AggregateOp.Type;
type AggregateSpec = typeof AggregateSpec.Type;
type OrderDirection = typeof OrderDirection.Type;
type OrderBySpec = typeof OrderBySpec.Type;
type HavingClause = typeof HavingClause.Type;
type ComputeOp = typeof ComputeOp.Type;
type ComputeSpec = typeof ComputeSpec.Type;
type DatalogQuery = typeof DatalogQuery.Type;
type WrapperFilterOp = typeof WrapperFilterOp.Type;
type WrapperFilter = typeof WrapperFilter.Type;
type WrappedQuery = typeof WrappedQuery.Type;
/**
 * Check if a term is a variable (starts with ?)
 */
declare const isVariable: (term: unknown) => term is string;
/**
 * Check if a term is an attribute (starts with :)
 */
declare const isAttribute: (term: unknown) => term is string;
/**
 * Check if a clause is a predicate clause (first element is an operator)
 */
declare const isPredicateClause: (clause: Clause) => clause is PredicateClause;
/**
 * Check if a clause is a not clause (first element is "not")
 */
declare const isNotClause: (clause: Clause) => clause is NotClause;
/**
 * Check if a clause is an or clause (first element is "or")
 */
declare const isOrClause: (clause: Clause) => clause is OrClause;
declare const normalizeOrAlternatives: (orClause: OrClause | readonly ["or", ...Clause[]]) => OrAlternative[];
/**
 * Check if a clause is a rule application (first element is alphanumeric, no ? or :,
 * and second element is NOT an attribute - this distinguishes from patterns)
 *
 * Pattern: ["p1", ":name", "Alice"] - second element is attribute (:name)
 * Rule:    ["ancestor", "alice", "?x"] - second element is term (alice), not attribute
 */
declare const isRuleApplication: (clause: Clause) => clause is RuleApplication;
/**
 * Check if a clause is a pattern clause (not a predicate, not, or, or rule application)
 * Accepts both 3-tuple and 4-tuple patterns
 */
declare const isPatternClause: (clause: Clause) => clause is PatternClause;
/**
 * Check if a pattern clause is a 4-tuple (includes transaction binding)
 */
declare const isPattern4Tuple: (pattern: PatternClause) => pattern is PatternClause4;
/**
 * Query compilation and execution metrics
 */
declare const QueryMetrics: Schema.Struct<{
  readonly joinCount: Schema.Number;
  readonly whereConditionCount: Schema.Number;
  readonly subqueryCount: Schema.Number;
  readonly cteCount: Schema.Number;
  readonly sqlLength: Schema.Number;
  readonly paramCount: Schema.Number;
  readonly patternCount: Schema.Number;
  readonly predicateCount: Schema.Number;
  readonly notClauseCount: Schema.Number;
  readonly orClauseCount: Schema.Number;
  readonly hasAggregation: Schema.Boolean;
  readonly isRecursive: Schema.Boolean;
  readonly aggregateOps: Schema.$Array<Schema.String>;
  readonly compilationTimeMs: Schema.Number;
}>;
type QueryMetrics = typeof QueryMetrics.Type;
/**
 * A single step in a query plan.
 * For SQL backends, this is a SQL statement.
 * For DynamoDB, this might be a JSON-serialized scan/query operation.
 * For any backend, it's an opaque string representation of what will execute.
 */
declare const QueryPlanStep: Schema.Struct<{
  /** Human-readable label for this step (e.g., "main", "count", "CTE: ancestor") */readonly label: Schema.String; /** The query string in the backend's native format (SQL, JSON, etc.) */
  readonly query: Schema.String; /** Parameters/bindings for the query */
  readonly params: Schema.optional<Schema.$Array<Schema.Unknown>>;
}>;
type QueryPlanStep = typeof QueryPlanStep.Type;
/**
 * Backend-agnostic query plan: the compiled queries that would execute.
 */
declare const QueryPlan: Schema.Struct<{
  /** The backend that generated this plan (e.g., "sqlite", "postgresql", "dynamodb") */readonly backend: Schema.String; /** Ordered list of query steps that would execute */
  readonly steps: Schema.$Array<Schema.Struct<{
    /** Human-readable label for this step (e.g., "main", "count", "CTE: ancestor") */readonly label: Schema.String; /** The query string in the backend's native format (SQL, JSON, etc.) */
    readonly query: Schema.String; /** Parameters/bindings for the query */
    readonly params: Schema.optional<Schema.$Array<Schema.Unknown>>;
  }>>;
}>;
type QueryPlan = typeof QueryPlan.Type;
/**
 * Debug information returned with query results when debug mode is enabled
 */
declare const QueryDebugInfo: Schema.Struct<{
  readonly metrics: Schema.Struct<{
    readonly joinCount: Schema.Number;
    readonly whereConditionCount: Schema.Number;
    readonly subqueryCount: Schema.Number;
    readonly cteCount: Schema.Number;
    readonly sqlLength: Schema.Number;
    readonly paramCount: Schema.Number;
    readonly patternCount: Schema.Number;
    readonly predicateCount: Schema.Number;
    readonly notClauseCount: Schema.Number;
    readonly orClauseCount: Schema.Number;
    readonly hasAggregation: Schema.Boolean;
    readonly isRecursive: Schema.Boolean;
    readonly aggregateOps: Schema.$Array<Schema.String>;
    readonly compilationTimeMs: Schema.Number;
  }>;
  readonly executionTimeMs: Schema.Number;
  readonly resultCount: Schema.Number;
  readonly generatedSql: Schema.String;
  readonly params: Schema.$Array<Schema.Unknown>;
  readonly queryPlan: Schema.optional<Schema.Struct<{
    /** The backend that generated this plan (e.g., "sqlite", "postgresql", "dynamodb") */readonly backend: Schema.String; /** Ordered list of query steps that would execute */
    readonly steps: Schema.$Array<Schema.Struct<{
      /** Human-readable label for this step (e.g., "main", "count", "CTE: ancestor") */readonly label: Schema.String; /** The query string in the backend's native format (SQL, JSON, etc.) */
      readonly query: Schema.String; /** Parameters/bindings for the query */
      readonly params: Schema.optional<Schema.$Array<Schema.Unknown>>;
    }>>;
  }>>;
}>;
type QueryDebugInfo = typeof QueryDebugInfo.Type;
/**
 * Result of explaining a query (compile without execute).
 */
declare const ExplainResult: Schema.Struct<{
  readonly queryPlan: Schema.Struct<{
    /** The backend that generated this plan (e.g., "sqlite", "postgresql", "dynamodb") */readonly backend: Schema.String; /** Ordered list of query steps that would execute */
    readonly steps: Schema.$Array<Schema.Struct<{
      /** Human-readable label for this step (e.g., "main", "count", "CTE: ancestor") */readonly label: Schema.String; /** The query string in the backend's native format (SQL, JSON, etc.) */
      readonly query: Schema.String; /** Parameters/bindings for the query */
      readonly params: Schema.optional<Schema.$Array<Schema.Unknown>>;
    }>>;
  }>;
  readonly metrics: Schema.optional<Schema.Struct<{
    readonly joinCount: Schema.Number;
    readonly whereConditionCount: Schema.Number;
    readonly subqueryCount: Schema.Number;
    readonly cteCount: Schema.Number;
    readonly sqlLength: Schema.Number;
    readonly paramCount: Schema.Number;
    readonly patternCount: Schema.Number;
    readonly predicateCount: Schema.Number;
    readonly notClauseCount: Schema.Number;
    readonly orClauseCount: Schema.Number;
    readonly hasAggregation: Schema.Boolean;
    readonly isRecursive: Schema.Boolean;
    readonly aggregateOps: Schema.$Array<Schema.String>;
    readonly compilationTimeMs: Schema.Number;
  }>>;
}>;
type ExplainResult = typeof ExplainResult.Type;
/**
 * Array of query result bindings (variable name -> value)
 */
declare const DatalogQueryResults: Schema.$Array<Schema.$Record<Schema.String, Schema.Unknown>>;
type DatalogQueryResults = typeof DatalogQueryResults.Type;
/**
 * Complete Datalog query response with results and optional debug info
 */
declare const DatalogQueryResponse: Schema.Struct<{
  readonly results: Schema.$Array<Schema.$Record<Schema.String, Schema.Unknown>>;
  readonly debug: Schema.optional<Schema.Struct<{
    readonly metrics: Schema.Struct<{
      readonly joinCount: Schema.Number;
      readonly whereConditionCount: Schema.Number;
      readonly subqueryCount: Schema.Number;
      readonly cteCount: Schema.Number;
      readonly sqlLength: Schema.Number;
      readonly paramCount: Schema.Number;
      readonly patternCount: Schema.Number;
      readonly predicateCount: Schema.Number;
      readonly notClauseCount: Schema.Number;
      readonly orClauseCount: Schema.Number;
      readonly hasAggregation: Schema.Boolean;
      readonly isRecursive: Schema.Boolean;
      readonly aggregateOps: Schema.$Array<Schema.String>;
      readonly compilationTimeMs: Schema.Number;
    }>;
    readonly executionTimeMs: Schema.Number;
    readonly resultCount: Schema.Number;
    readonly generatedSql: Schema.String;
    readonly params: Schema.$Array<Schema.Unknown>;
    readonly queryPlan: Schema.optional<Schema.Struct<{
      /** The backend that generated this plan (e.g., "sqlite", "postgresql", "dynamodb") */readonly backend: Schema.String; /** Ordered list of query steps that would execute */
      readonly steps: Schema.$Array<Schema.Struct<{
        /** Human-readable label for this step (e.g., "main", "count", "CTE: ancestor") */readonly label: Schema.String; /** The query string in the backend's native format (SQL, JSON, etc.) */
        readonly query: Schema.String; /** Parameters/bindings for the query */
        readonly params: Schema.optional<Schema.$Array<Schema.Unknown>>;
      }>>;
    }>>;
  }>>; /** Authorization decision identifier for auditing and trace correlation */
  readonly decisionId: Schema.optional<Schema.String>;
}>;
type DatalogQueryResponse = typeof DatalogQueryResponse.Type;
/**
 * A single diagnostic from the type checker.
 */
declare const TypeCheckDiagnosticSchema: Schema.Struct<{
  readonly severity: Schema.Literals<readonly ["error", "warning", "info"]>;
  readonly message: Schema.String;
  readonly clauseIndex: Schema.optional<Schema.Number>;
  readonly variable: Schema.optional<Schema.String>;
  readonly attribute: Schema.optional<Schema.String>;
}>;
type TypeCheckDiagnosticSchema = typeof TypeCheckDiagnosticSchema.Type;
/**
 * Response from the type-check endpoint.
 *
 * Contains inferred variable types, the computed result type,
 * diagnostics (errors/warnings), and a convenience hasErrors flag.
 */
declare const TypeCheckResponse: Schema.Struct<{
  /** Inferred types for each query variable (e.g., "?name" → "Str") */readonly variableTypes: Schema.$Record<Schema.String, Schema.String>; /** The computed result type as a display string (e.g., "List<{name: Str, age: Num}>") */
  readonly resultType: Schema.String; /** All diagnostics from the type checker */
  readonly diagnostics: Schema.$Array<Schema.Struct<{
    readonly severity: Schema.Literals<readonly ["error", "warning", "info"]>;
    readonly message: Schema.String;
    readonly clauseIndex: Schema.optional<Schema.Number>;
    readonly variable: Schema.optional<Schema.String>;
    readonly attribute: Schema.optional<Schema.String>;
  }>>; /** Whether any error-severity diagnostics exist */
  readonly hasErrors: Schema.Boolean;
}>;
type TypeCheckResponse = typeof TypeCheckResponse.Type;
//#endregion
export { AggregateOp, AggregateSpec, Clause, ComputeOp, ComputeSpec, Constant, DatalogAttribute, DatalogQuery, DatalogQueryResponse, DatalogQueryResults, ExplainResult, HavingClause, NotClause, OrAlternative, OrClause, OrderBySpec, OrderDirection, PatternClause, PatternClause3, PatternClause4, PredicateClause, PredicateOp, QueryDebugInfo, QueryMetrics, QueryPlan, QueryPlanStep, Rule, RuleApplication, RuleBodyClause, Term, TypeCheckDiagnosticSchema, TypeCheckResponse, TypedConstant, Variable, WrappedQuery, WrappedQueryResponse, WrapperFilter, WrapperFilterOp, isAttribute, isNotClause, isOrClause, isPattern4Tuple, isPatternClause, isPredicateClause, isRuleApplication, isTypedConstant, isVariable, normalizeOrAlternatives };
//# sourceMappingURL=schema.d.ts.map