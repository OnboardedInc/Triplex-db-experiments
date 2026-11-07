import { Schema } from "effect";
import { integer } from "../../packages/core/dist/index.js";
import { TypeExpr as T, TypeSchema } from "../../packages/core/dist/config/index.js";
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const distribute = (expr: T.TypeExpr): T.TypeExpr => {
  if (expr._tag === "Constrained" && expr.base._tag === "Union")
    return T.union(
      expr.base.members.map((member) => distribute(T.constrained(member, expr.constraints))),
    );
  return expr;
};
const hasExact = (expr: T.TypeExpr): boolean =>
  expr._tag === "Prim"
    ? expr.prim === "int64"
    : expr._tag === "Union"
      ? expr.members.some(hasExact)
      : expr._tag === "Constrained"
        ? hasExact(expr.base)
        : false;
const awareCodec = (expr: T.TypeExpr): Schema.Codec<unknown, unknown> => {
  if (expr._tag !== "Constrained" || !hasExact(expr.base)) return TypeSchema.compile(expr);
  if (expr.constraints.some((c) => c._tag !== "Min" && c._tag !== "Max"))
    throw new TypeError("Only numeric bounds are supported on exact numeric unions");
  if (
    expr.constraints.some(
      (c) => (c._tag === "Min" || c._tag === "Max") && !Number.isSafeInteger(c.value),
    )
  )
    throw new RangeError("Exact schema bounds must be safe integer literals");
  return TypeSchema.compile(expr.base).check(
    Schema.makeFilter(
      (value: unknown) =>
        expr.constraints.every((c) => {
          if (c._tag !== "Min" && c._tag !== "Max") return false;
          if (typeof value === "number")
            return c._tag === "Min" ? value >= c.value : value <= c.value;
          if (
            typeof value !== "object" ||
            value === null ||
            !("type" in value) ||
            value.type !== "integer" ||
            !("value" in value) ||
            typeof value.value !== "string"
          )
            return false;
          return c._tag === "Min"
            ? BigInt(value.value) >= BigInt(c.value)
            : BigInt(value.value) <= BigInt(c.value);
        }),
      { message: "Value is outside exact numeric bounds" },
    ),
  );
};
const bounded = T.constrained(T.union([T.int64, T.number]), [T.min(0), T.max(10)]);
const large = T.constrained(T.union([T.int64, T.number]), [T.min(Number.MAX_SAFE_INTEGER)]);
const nested = T.constrained(T.union([T.constrained(T.int64, [T.min(0)]), T.number]), [T.max(10)]);
const fixtures = [
  { name: "exact-low", type: bounded, value: integer(0n), expected: true },
  { name: "exact-interior", type: bounded, value: integer(5n), expected: true },
  { name: "exact-high", type: bounded, value: integer(10n), expected: true },
  { name: "exact-below", type: bounded, value: integer(-1n), expected: false },
  { name: "exact-above", type: bounded, value: integer(11n), expected: false },
  { name: "float-interior", type: bounded, value: 5.5, expected: true },
  { name: "number-high", type: bounded, value: 10, expected: true },
  { name: "number-above", type: bounded, value: 10.5, expected: false },
  { name: "wrong-text", type: bounded, value: "5", expected: false },
  { name: "wrong-shape", type: bounded, value: { type: "integer", value: "bad" }, expected: false },
  { name: "large-boundary", type: large, value: integer("9007199254740991"), expected: true },
  { name: "large-exact-below", type: large, value: integer("9007199254740990"), expected: false },
  { name: "large-exact-above", type: large, value: integer("9007199254740992"), expected: true },
  { name: "nested-exact", type: nested, value: integer(5n), expected: true },
  { name: "nested-below", type: nested, value: integer(-1n), expected: false },
  { name: "nested-above", type: nested, value: integer(11n), expected: false },
];
const candidates = {
  baseline: (expr: T.TypeExpr) => TypeSchema.compile(expr),
  distributed: (expr: T.TypeExpr) => TypeSchema.compile(distribute(expr)),
  aware: awareCodec,
};
const outcomes = Object.entries(candidates).map(([name, compile]) => ({
  name,
  cases: fixtures.map((fixture) => {
    const actual = Schema.is(compile(fixture.type))(fixture.value);
    return {
      name: fixture.name,
      actual,
      expected: fixture.expected,
      pass: actual === fixture.expected,
    };
  }),
}));
const report = {
  format: "triplex-schema-bounds-experiment/1",
  at: new Date().toISOString(),
  outcomes,
  databaseWrites: 0,
  qualification: "Pure schema correctness; no candidate promoted",
};
const output = `qualification/evidence/schema-bounds-${randomUUID()}.json`;
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(
  JSON.stringify({
    output,
    results: outcomes.map((r) => ({
      name: r.name,
      passed: r.cases.filter((c) => c.pass).length,
      total: r.cases.length,
    })),
  }),
);
if (outcomes.slice(1).some((r) => r.cases.some((c) => !c.pass))) process.exitCode = 1;
